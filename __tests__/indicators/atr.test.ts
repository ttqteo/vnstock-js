import { atr } from "../../src/indicators/atr";

describe("atr", () => {
  // 15 candles, simple HLC
  const data = [
    { date: "2024-01-01", open: 10, high: 11, low: 9, close: 10, volume: 0 },
    { date: "2024-01-02", open: 10, high: 12, low: 10, close: 11, volume: 0 },
    { date: "2024-01-03", open: 11, high: 13, low: 11, close: 12, volume: 0 },
    { date: "2024-01-04", open: 12, high: 14, low: 12, close: 13, volume: 0 },
    { date: "2024-01-05", open: 13, high: 15, low: 13, close: 14, volume: 0 },
    { date: "2024-01-06", open: 14, high: 16, low: 14, close: 15, volume: 0 },
    { date: "2024-01-07", open: 15, high: 17, low: 15, close: 16, volume: 0 },
    { date: "2024-01-08", open: 16, high: 18, low: 16, close: 17, volume: 0 },
    { date: "2024-01-09", open: 17, high: 19, low: 17, close: 18, volume: 0 },
    { date: "2024-01-10", open: 18, high: 20, low: 18, close: 19, volume: 0 },
    { date: "2024-01-11", open: 19, high: 21, low: 19, close: 20, volume: 0 },
    { date: "2024-01-12", open: 20, high: 22, low: 20, close: 21, volume: 0 },
    { date: "2024-01-13", open: 21, high: 23, low: 21, close: 22, volume: 0 },
    { date: "2024-01-14", open: 22, high: 24, low: 22, close: 23, volume: 0 },
    { date: "2024-01-15", open: 23, high: 25, low: 23, close: 24, volume: 0 },
  ];

  it("returns same length as input", () => {
    const result = atr(data, 14);
    expect(result).toHaveLength(15);
  });

  it("first period-1 entries are null", () => {
    const result = atr(data, 14);
    for (let i = 0; i < 13; i++) {
      expect(result[i].atr).toBeNull();
    }
    expect(result[13].atr).not.toBeNull();
  });

  it("computes ATR with Wilder smoothing", () => {
    // After 14 candles: TR[0]=2, TR[1..14] each ~2 (high-low=2, prev close diff small)
    // Initial ATR(14) = avg(TR[0..13]) ≈ 2
    const result = atr(data, 14);
    expect(result[13].atr as number).toBeGreaterThan(1.5);
    expect(result[13].atr as number).toBeLessThan(2.5);
  });

  it("ATR continues to smooth on subsequent bars", () => {
    const result = atr(data, 14);
    expect(result[14].atr).not.toBeNull();
    // Wilder: new = (old * 13 + tr) / 14
    const prev = result[13].atr as number;
    const cur = result[14].atr as number;
    expect(Math.abs(cur - prev)).toBeLessThan(prev); // small change
  });

  it("preserves dates", () => {
    const result = atr(data, 14);
    expect(result[0].date).toBe("2024-01-01");
    expect(result[14].date).toBe("2024-01-15");
  });

  it("returns empty array for empty input", () => {
    expect(atr([], 14)).toEqual([]);
  });

  it("throws on period < 1", () => {
    expect(() => atr(data, 0)).toThrow();
  });

  it("uses default period of 14", () => {
    const r1 = atr(data);
    const r2 = atr(data, 14);
    expect(r1[14].atr).toBeCloseTo(r2[14].atr as number);
  });
});
