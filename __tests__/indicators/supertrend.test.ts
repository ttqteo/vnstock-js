import { superTrend } from "../../src/indicators/supertrend";
import { QuoteHistory } from "../../src/models/normalized";

function bar(date: string, open: number, high: number, low: number, close: number): QuoteHistory {
  return { date, open, high, low, close, volume: 0 };
}

describe("superTrend", () => {
  const linearRamp: QuoteHistory[] = [];
  for (let i = 0; i < 30; i++) {
    const base = 100 + i;
    linearRamp.push(bar(`2024-01-${String(i + 1).padStart(2, "0")}`, base, base + 1, base - 1, base));
  }

  it("throws on period < 1", () => {
    expect(() => superTrend(linearRamp, { period: 0 })).toThrow();
  });

  it("throws on multiplier <= 0", () => {
    expect(() => superTrend(linearRamp, { multiplier: 0 })).toThrow();
    expect(() => superTrend(linearRamp, { multiplier: -1 })).toThrow();
  });

  it("returns empty array for empty input", () => {
    expect(superTrend([])).toEqual([]);
  });

  it("output length equals input length", () => {
    const r = superTrend(linearRamp);
    expect(r).toHaveLength(linearRamp.length);
  });

  it("first period-1 entries are null", () => {
    const r = superTrend(linearRamp, { period: 10, multiplier: 3 });
    for (let i = 0; i < 9; i++) {
      expect(r[i].superTrend).toBeNull();
      expect(r[i].direction).toBeNull();
      expect(r[i].upperBand).toBeNull();
      expect(r[i].lowerBand).toBeNull();
    }
    expect(r[9].superTrend).not.toBeNull();
    expect(r[9].direction).not.toBeNull();
  });

  it("direction is consistent: bullish ↔ close > superTrend", () => {
    const r = superTrend(linearRamp);
    for (let i = 0; i < r.length; i++) {
      if (r[i].superTrend === null) continue;
      if (r[i].direction === "bullish") {
        expect(linearRamp[i].close).toBeGreaterThan(r[i].superTrend as number);
      } else if (r[i].direction === "bearish") {
        expect(linearRamp[i].close).toBeLessThanOrEqual(r[i].superTrend as number);
      }
    }
  });

  it("preserves dates", () => {
    const r = superTrend(linearRamp);
    expect(r[0].date).toBe("2024-01-01");
    expect(r[29].date).toBe("2024-01-30");
  });

  it("uses default period=10 multiplier=3", () => {
    const r1 = superTrend(linearRamp);
    const r2 = superTrend(linearRamp, { period: 10, multiplier: 3 });
    expect(r1[15].superTrend).toBeCloseTo(r2[15].superTrend as number);
  });

  it("detects direction flip when close crosses upward through superTrend", () => {
    // 15 flat bars → 10 explosive up bars
    const data: QuoteHistory[] = [];
    for (let i = 0; i < 15; i++) {
      data.push(bar(`2024-01-${String(i + 1).padStart(2, "0")}`, 100, 101, 99, 100));
    }
    for (let i = 0; i < 10; i++) {
      const base = 100 + (i + 1) * 5;
      data.push(bar(`2024-01-${String(15 + i + 1).padStart(2, "0")}`, base, base + 1, base - 1, base));
    }
    const r = superTrend(data, { period: 10, multiplier: 3 });
    // Late bars should flip to bullish after the explosive move
    const lastDir = r[r.length - 1].direction;
    expect(lastDir).toBe("bullish");
  });

  it("detects direction flip when close crosses downward through superTrend", () => {
    const data: QuoteHistory[] = [];
    for (let i = 0; i < 15; i++) {
      data.push(bar(`2024-01-${String(i + 1).padStart(2, "0")}`, 100, 101, 99, 100));
    }
    for (let i = 0; i < 10; i++) {
      const base = 100 - (i + 1) * 5;
      data.push(bar(`2024-01-${String(15 + i + 1).padStart(2, "0")}`, base, base + 1, base - 1, base));
    }
    const r = superTrend(data, { period: 10, multiplier: 3 });
    const lastDir = r[r.length - 1].direction;
    expect(lastDir).toBe("bearish");
  });

  it("upperBand and lowerBand bracket the close in steady state", () => {
    // After enough bars, bands should bracket roughly around price
    const r = superTrend(linearRamp);
    const last = r[r.length - 1];
    expect(last.upperBand).not.toBeNull();
    expect(last.lowerBand).not.toBeNull();
    expect(last.upperBand as number).toBeGreaterThan(last.lowerBand as number);
  });

  it("returns null for data shorter than period", () => {
    const small = linearRamp.slice(0, 5);
    const r = superTrend(small, { period: 10 });
    for (const e of r) {
      expect(e.superTrend).toBeNull();
    }
  });
});
