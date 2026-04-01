import { rsi } from "../../src/indicators/rsi";

describe("rsi", () => {
  const prices = [44,44.34,44.09,43.61,44.33,44.83,45.10,45.42,45.84,46.08,45.89,46.03,45.61,46.28,46.28,46.00,46.03,46.41,46.22,45.64];
  const data = prices.map((p, i) => ({
    date: `2024-01-${String(i + 1).padStart(2, "0")}`,
    open: p,
    high: p + 0.5,
    low: p - 0.5,
    close: p,
    volume: 1000,
  }));

  it("returns correct length", () => {
    const result = rsi(data, { period: 14 });
    expect(result).toHaveLength(data.length);
  });

  it("returns null for first period values", () => {
    const result = rsi(data, { period: 14 });
    for (let i = 0; i < 14; i++) {
      expect(result[i].rsi).toBeNull();
    }
  });

  it("calculates RSI between 0 and 100", () => {
    const result = rsi(data, { period: 14 });
    result.forEach((r) => {
      if (r.rsi !== null) {
        expect(r.rsi).toBeGreaterThanOrEqual(0);
        expect(r.rsi).toBeLessThanOrEqual(100);
      }
    });
  });

  it("preserves date from input", () => {
    const result = rsi(data, { period: 14 });
    expect(result[0].date).toBe("2024-01-01");
  });

  it("throws on period < 1", () => {
    expect(() => rsi(data, { period: 0 })).toThrow();
  });

  it("returns empty array for empty input", () => {
    expect(rsi([], { period: 14 })).toEqual([]);
  });

  it("uses default period of 14", () => {
    const result = rsi(data);
    expect(result[13].rsi).toBeNull();
    expect(result[14].rsi).not.toBeNull();
  });
});
