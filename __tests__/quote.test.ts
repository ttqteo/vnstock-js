import vnstock from "../src";

describe("Quote", () => {
  it("should return normalized history for a symbol", async () => {
    const data = await vnstock.stock.quote.history({
      symbols: ["VCI"],
      start: "2024-01-01",
      end: "2024-01-31",
      timeFrame: "1D",
    });

    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    const item = data[0];
    expect(item).toHaveProperty("date");
    expect(item).toHaveProperty("open");
    expect(item).toHaveProperty("high");
    expect(item).toHaveProperty("low");
    expect(item).toHaveProperty("close");
    expect(item).toHaveProperty("volume");

    expect(item).not.toHaveProperty("o");
    expect(item).not.toHaveProperty("h");
    expect(item).not.toHaveProperty("t");

    expect(typeof item.date).toBe("string");
    expect(item.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(typeof item.open).toBe("number");
    expect(typeof item.volume).toBe("number");

    // Prices should be divided by 1000
    expect(item.open).toBeLessThan(1000);
    expect(item.close).toBeLessThan(1000);
  }, 30000);

  it("should return normalized history for VNINDEX", async () => {
    const data = await vnstock.stock.quote.history({
      symbols: ["VNINDEX"],
      start: "2024-01-01",
      end: "2024-01-31",
      timeFrame: "1D",
    });

    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty("date");
    expect(data[0]).toHaveProperty("close");
  }, 30000);
});
