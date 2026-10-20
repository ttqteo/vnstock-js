import { Transport } from "../transport";
import { InvalidParameterError } from "../errors";
import { FinancialNews } from "../models/normalized";
import { ictToday } from "../shared/time";

export type { FinancialNews } from "../models/normalized";

const NEWS_BASE_URL = "https://raw.githubusercontent.com/ttqteo/news-crawler/master/docs/news";
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export interface NewsOptions {
  /** YYYY-MM-DD; default today in ICT. */
  date?: string;
  /** Keep items whose source contains this text, case-insensitive. */
  source?: string;
  /** Keep items whose title or summary contains this text, case-insensitive. */
  query?: string;
  now?: number;
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

/**
 * One day of Vietnamese financial news from the news-crawler archive, newest first.
 * @example
 * const items = await news(transport, { date: "2026-10-14", query: "ngân hàng" });
 */
export async function news(t: Transport, options: NewsOptions = {}): Promise<FinancialNews[]> {
  const date = options.date || ictToday(options.now);
  const m = DATE_RE.exec(date);
  if (!m) throw new InvalidParameterError("date", date, undefined, "Dates are YYYY-MM-DD.");
  let raw: Record<string, any>;
  try {
    raw = await t.request<Record<string, any>>({ url: NEWS_BASE_URL + "/" + m[2] + "-" + m[3] + "-" + m[1] + ".json", method: "GET" });
  } catch (e: any) {
    // No file means no news was crawled that day.
    if (e && e.statusCode === 404) return [];
    throw e;
  }
  if (!raw || typeof raw !== "object") return [];
  let items = Object.keys(raw).map((k) => normalize(raw[k]));
  if (options.source) {
    const s = options.source.toLowerCase();
    items = items.filter((n) => n.source.toLowerCase().includes(s));
  }
  if (options.query) {
    const q = options.query.toLowerCase();
    items = items.filter((n) => n.title.toLowerCase().includes(q) || n.summary.toLowerCase().includes(q));
  }
  return items.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}
