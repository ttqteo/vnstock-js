import { fetchWithRetry } from "../../pipeline/fetch";
import { FinancialNews } from "../../models/normalized";

const NEWS_BASE_URL =
  "https://raw.githubusercontent.com/ttqteo/news-crawler/master/docs/news";

function formatDateMDY(date?: string): string {
  var d: Date;
  if (date) {
    var m = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) throw new Error("Invalid date format. Expected YYYY-MM-DD, got: " + date);
    d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  } else {
    d = new Date();
  }
  var mm = String(d.getMonth() + 1).padStart(2, "0");
  var dd = String(d.getDate()).padStart(2, "0");
  var yyyy = String(d.getFullYear());
  return mm + "-" + dd + "-" + yyyy;
}

function normalize(raw: any): FinancialNews {
  return {
    id: raw.item_id || "",
    source: raw.source || "",
    title: raw.title || "",
    summary: raw.summary || "",
    link: raw.link || "",
    image: raw.image || "",
    publishedAt: raw.published || "",
  };
}

export class News {
  async byDate(date?: string): Promise<FinancialNews[]> {
    var fileKey = formatDateMDY(date);
    var raw: Record<string, any>;
    try {
      raw = await fetchWithRetry<Record<string, any>>({
        url: NEWS_BASE_URL + "/" + fileKey + ".json",
        method: "GET",
      }, { retries: 1 });
    } catch (e: any) {
      if (e && e.statusCode === 404) return [];
      throw e;
    }
    if (!raw || typeof raw !== "object") return [];
    var items: FinancialNews[] = [];
    for (var k in raw) {
      if (Object.prototype.hasOwnProperty.call(raw, k)) {
        items.push(normalize(raw[k]));
      }
    }
    items.sort(function (a, b) { return b.publishedAt.localeCompare(a.publishedAt); });
    return items;
  }

  async bySource(source: string, date?: string): Promise<FinancialNews[]> {
    var all = await this.byDate(date);
    var lower = source.toLowerCase();
    return all.filter(function (n) { return n.source.toLowerCase().indexOf(lower) !== -1; });
  }

  async search(keyword: string, date?: string): Promise<FinancialNews[]> {
    var all = await this.byDate(date);
    var lower = keyword.toLowerCase();
    return all.filter(function (n) {
      return (
        n.title.toLowerCase().indexOf(lower) !== -1 ||
        n.summary.toLowerCase().indexOf(lower) !== -1
      );
    });
  }
}
