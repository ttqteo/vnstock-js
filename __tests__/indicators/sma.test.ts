import { sma } from "../../src/indicators/sma";

describe("sma", () => {
  const data = [
    { date: "2024-01-01", open: 10, high: 11, low: 9, close: 10, volume: 100 },
    { date: "2024-01-02", open: 11, high: 12, low: 10, close: 11, volume: 200 },
    { date: "2024-01-03", open: 12, high: 13, low: 11, close: 12, volume: 300 },
    { date: "2024-01-04", open: 13, high: 14, low: 12, close: 13, volume: 400 },
    { date: "2024-01-05", open: 14, high: 15, low: 13, close: 14, volume: 500 },
  ];

  it("calculates SMA with default field (close)", () => {
    const result = sma(data, { period: 3 });
    expect(result).toHaveLength(5);
    expect(result[0].sma).toBeNull();
    expect(result[1].sma).toBeNull();
    expect(result[2].sma).toBeCloseTo(11);
    expect(result[3].sma).toBeCloseTo(12);
    expect(result[4].sma).toBeCloseTo(13);
  });

  it("preserves date from input", () => {
    const result = sma(data, { period: 3 });
    expect(result[0].date).toBe("2024-01-01");
    expect(result[4].date).toBe("2024-01-05");
  });

  it("calculates SMA on custom field", () => {
    const result = sma(data, { period: 2, field: "volume" });
    expect(result[0].sma).toBeNull();
    expect(result[1].sma).toBeCloseTo(150);
    expect(result[2].sma).toBeCloseTo(250);
  });

  it("returns all nulls when period > data length", () => {
    const result = sma(data, { period: 10 });
    result.forEach((r) => expect(r.sma).toBeNull());
  });

  it("throws on period < 1", () => {
    expect(() => sma(data, { period: 0 })).toThrow();
  });

  it("returns empty array for empty input", () => {
    expect(sma([], { period: 3 })).toEqual([]);
  });
});
