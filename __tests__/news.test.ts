import vnstock from "../src";

describe("News", () => {
  it("should fetch news for a recent date", async () => {
    const data = await vnstock.news.byDate("2026-05-14");
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    const first = data[0];
    expect(first).toHaveProperty("id");
    expect(first).toHaveProperty("source");
    expect(first).toHaveProperty("title");
    expect(first).toHaveProperty("summary");
    expect(first).toHaveProperty("link");
    expect(first).toHaveProperty("publishedAt");
  }, 30000);

  it("should return empty array for non-existent date", async () => {
    const data = await vnstock.news.byDate("1990-01-01");
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(0);
  }, 30000);

  it("should filter by source", async () => {
    const data = await vnstock.news.bySource("Vietstock", "2026-05-14");
    expect(Array.isArray(data)).toBe(true);
    if (data.length > 0) {
      expect(data[0].source.toLowerCase()).toContain("vietstock");
    }
  }, 30000);

  it("should search by keyword", async () => {
    const data = await vnstock.news.search("VN-Index", "2026-05-14");
    expect(Array.isArray(data)).toBe(true);
    if (data.length > 0) {
      const hay = (data[0].title + " " + data[0].summary).toLowerCase();
      expect(hay).toContain("vn-index");
    }
  }, 30000);

  it("should throw on invalid date format", async () => {
    await expect(vnstock.news.byDate("14/05/2026")).rejects.toThrow(/Invalid date format/);
  });
});
