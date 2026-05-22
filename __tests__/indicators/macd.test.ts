import { macd } from "../../src/indicators/macd";

function makeCandle(date: string, close: number) {
  return { date, open: close, high: close, low: close, close, volume: 0 };
}

describe("macd", () => {
  // Synthetic uptrend 35 candles cho fast=12, slow=26, signal=9 → cần >= slow + signal + buffer
  const closes = [
    22, 22.5, 23, 22.8, 23.2, 23.5, 24, 24.2, 24.5, 25,
    25.5, 26, 26.3, 26.8, 27.1, 27.5, 28, 28.3, 28.7, 29,
    29.5, 30, 30.2, 30.5, 31, 31.5, 32, 32.3, 32.8, 33.2,
    33.5, 34, 34.2, 34.5, 35,
  ];
  const data = closes.map((c, i) => makeCandle(`2024-01-${String(i + 1).padStart(2, "0")}`, c));

  it("returns same length as input", () => {
    const result = macd(data);
    expect(result).toHaveLength(data.length);
  });

  it("first slow-1 entries have null macd", () => {
    const result = macd(data);
    for (let i = 0; i < 25; i++) {
      expect(result[i].macd).toBeNull();
    }
  });

  it("macd line is positive for uptrend after slow period", () => {
    const result = macd(data);
    const last = result[result.length - 1];
    expect(last.macd).not.toBeNull();
    expect(last.macd as number).toBeGreaterThan(0);
  });

  it("signal line lags macd line", () => {
    const result = macd(data);
    const last = result[result.length - 1];
    expect(last.signal).not.toBeNull();
    expect(last.histogram).not.toBeNull();
    expect(Math.abs(last.histogram as number)).toBeLessThanOrEqual(Math.abs(last.macd as number) * 2);
  });

  it("preserves dates", () => {
    const result = macd(data);
    expect(result[0].date).toBe("2024-01-01");
    expect(result[result.length - 1].date).toBe(data[data.length - 1].date);
  });

  it("returns empty array for empty input", () => {
    expect(macd([])).toEqual([]);
  });

  it("throws when fast >= slow", () => {
    expect(() => macd(data, { fast: 26, slow: 12 })).toThrow();
    expect(() => macd(data, { fast: 12, slow: 12 })).toThrow();
  });

  it("throws on period < 1", () => {
    expect(() => macd(data, { fast: 0 })).toThrow();
  });

  it("accepts custom periods", () => {
    const result = macd(data, { fast: 5, slow: 10, signal: 3 });
    expect(result).toHaveLength(data.length);
    expect(result[9].macd).not.toBeNull();
  });
});
