import { ichimoku } from "../../src/indicators/ichimoku";
import { QuoteHistory } from "../../src/models/normalized";

function bar(date: string, open: number, high: number, low: number, close: number): QuoteHistory {
  return { date, open, high, low, close, volume: 0 };
}

function makeLinearRamp(n: number): QuoteHistory[] {
  const out: QuoteHistory[] = [];
  for (let i = 0; i < n; i++) {
    const base = 100 + i;
    const date = `2024-${String(Math.floor(i / 30) + 1).padStart(2, "0")}-${String((i % 30) + 1).padStart(2, "0")}`;
    out.push(bar(date, base, base + 2, base - 2, base));
  }
  return out;
}

describe("ichimoku", () => {
  it("throws on tenkan < 1", () => {
    expect(() => ichimoku(makeLinearRamp(60), { tenkan: 0 })).toThrow();
  });

  it("throws on kijun < 1", () => {
    expect(() => ichimoku(makeLinearRamp(60), { kijun: 0 })).toThrow();
  });

  it("throws on senkou < 1", () => {
    expect(() => ichimoku(makeLinearRamp(60), { senkou: 0 })).toThrow();
  });

  it("throws on displacement < 1", () => {
    expect(() => ichimoku(makeLinearRamp(60), { displacement: 0 })).toThrow();
  });

  it("returns empty array for empty input", () => {
    expect(ichimoku([])).toEqual([]);
  });

  it("output length equals input length", () => {
    const data = makeLinearRamp(60);
    const r = ichimoku(data);
    expect(r).toHaveLength(60);
  });

  it("insufficient data (< 9 bars) returns all-null tenkan", () => {
    const data = makeLinearRamp(8);
    const r = ichimoku(data);
    for (const e of r) {
      expect(e.tenkanSen).toBeNull();
    }
  });

  it("tenkanSen[8] equals donchian(9) on linear ramp", () => {
    const data = makeLinearRamp(60);
    const r = ichimoku(data);
    // bars 0..8: highs 102..110, lows 98..106
    // donchian = (110 + 98) / 2 = 104
    expect(r[8].tenkanSen).toBeCloseTo(104);
  });

  it("kijunSen[25] equals donchian(26) on linear ramp", () => {
    const data = makeLinearRamp(60);
    const r = ichimoku(data);
    // bars 0..25: high max=127 (bar 25, base 125+2), low min=98 (bar 0)
    // donchian = (127 + 98) / 2 = 112.5
    expect(r[25].kijunSen).toBeCloseTo(112.5);
  });

  it("senkouSpanA at i uses tenkan/kijun from i-26 (current cloud convention)", () => {
    const data = makeLinearRamp(60);
    const r = ichimoku(data);
    // At i=52: senkouSpanA = (tenkan[26] + kijun[26]) / 2
    const t26 = r[26].tenkanSen as number;
    const k26 = r[26].kijunSen as number;
    expect(r[52].senkouSpanA).toBeCloseTo((t26 + k26) / 2);
  });

  it("senkouSpanA is null before displacement bars", () => {
    const data = makeLinearRamp(60);
    const r = ichimoku(data);
    for (let i = 0; i < 26; i++) {
      expect(r[i].senkouSpanA).toBeNull();
      expect(r[i].senkouSpanB).toBeNull();
    }
  });

  it("chikouSpan is null for last 26 bars", () => {
    const data = makeLinearRamp(60);
    const r = ichimoku(data);
    for (let i = data.length - 26; i < data.length; i++) {
      expect(r[i].chikouSpan).toBeNull();
    }
  });

  it("chikouSpan[i] equals close[i+26]", () => {
    const data = makeLinearRamp(60);
    const r = ichimoku(data);
    expect(r[0].chikouSpan).toBeCloseTo(data[26].close);
    expect(r[10].chikouSpan).toBeCloseTo(data[36].close);
  });

  it("cloudTop >= cloudBottom when both defined", () => {
    const data = makeLinearRamp(80);
    const r = ichimoku(data);
    for (const e of r) {
      if (e.cloudTop !== null && e.cloudBottom !== null) {
        expect(e.cloudTop).toBeGreaterThanOrEqual(e.cloudBottom);
      }
    }
  });

  it("preserves dates", () => {
    const data = makeLinearRamp(60);
    const r = ichimoku(data);
    expect(r[0].date).toBe(data[0].date);
    expect(r[59].date).toBe(data[59].date);
  });

  it("uses default periods 9/26/52/26", () => {
    const data = makeLinearRamp(80);
    const r1 = ichimoku(data);
    const r2 = ichimoku(data, { tenkan: 9, kijun: 26, senkou: 52, displacement: 26 });
    expect(r1[60].tenkanSen).toBeCloseTo(r2[60].tenkanSen as number);
    expect(r1[60].kijunSen).toBeCloseTo(r2[60].kijunSen as number);
    expect(r1[60].senkouSpanA).toBeCloseTo(r2[60].senkouSpanA as number);
  });
});
