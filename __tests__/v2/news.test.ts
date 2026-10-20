import { news } from "../../src/client/news";
import { ApiError, InvalidParameterError } from "../../src/errors";
import { Transport } from "../../src/transport";

const DAY = {
  a: {
    item_id: "a",
    source: "CafeF",
    title: "VN-Index vượt 1.700",
    summary: "Thanh khoản tăng",
    link: "https://x/a",
    image: "",
    published: "2026-10-14T09:00:00+07:00",
  },
  b: {
    item_id: "b",
    source: "VnExpress",
    title: "Giá vàng giảm",
    summary: "SJC giảm 1 triệu",
    link: "https://x/b",
    image: "",
    published: "2026-10-14T11:00:00+07:00",
  },
};

function transport(handler: (url: string) => unknown) {
  const urls: string[] = [];
  const t: Transport = {
    async request<T>(c: any): Promise<T> {
      urls.push(c.url);
      return handler(c.url) as T;
    },
  };
  return { t, urls };
}

describe("news", () => {
  it("reads one day of crawled news, newest first", async () => {
    const { t, urls } = transport(() => DAY);
    const items = await news(t, { date: "2026-10-14" });
    expect(urls[0]).toBe("https://raw.githubusercontent.com/ttqteo/news-crawler/master/docs/news/10-14-2026.json");
    expect(items.map((n) => n.id)).toEqual(["b", "a"]);
    expect(items[0]).toEqual({
      id: "b",
      source: "VnExpress",
      title: "Giá vàng giảm",
      summary: "SJC giảm 1 triệu",
      link: "https://x/b",
      image: "",
      publishedAt: "2026-10-14T11:00:00+07:00",
    });
  });

  it("filters by source and by query", async () => {
    const { t } = transport(() => DAY);
    expect((await news(t, { date: "2026-10-14", source: "cafef" })).map((n) => n.id)).toEqual(["a"]);
    expect((await news(t, { date: "2026-10-14", query: "sjc" })).map((n) => n.id)).toEqual(["b"]);
  });

  it("defaults to today in ICT", async () => {
    const { t, urls } = transport(() => ({}));
    await news(t, { now: Date.parse("2026-10-14T18:00:00Z") });
    expect(urls[0]).toContain("/10-15-2026.json");
  });

  it("returns an empty list for a day without a file", async () => {
    const { t } = transport(() => {
      throw new ApiError("HTTP 404: Not Found", 404);
    });
    expect(await news(t, { date: "2026-10-12" })).toEqual([]);
  });

  it("rejects a malformed date", async () => {
    await expect(news(transport(() => ({})).t, { date: "14/10/2026" })).rejects.toBeInstanceOf(InvalidParameterError);
  });
});
