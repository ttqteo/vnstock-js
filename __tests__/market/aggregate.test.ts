import { classifyRegime, computeBreadth, liquiditySignal } from "../../src/core/market/aggregate";
import { Bar, Quote } from "../../src/types";

// Money-valued aggregates moved to src/client/market.ts and are tested in __tests__/v2/market.test.ts.

function quote(over: Partial<Quote>): Quote {
  return {
    symbol: "AAA",
    name: "",
    nameEn: "",
    exchange: "HOSE",
    price: 10000,
    change: 0,
    changePct: 0,
    ref: 10000,
    ceiling: 10700,
    floor: 9300,
    high: 0,
    low: 0,
    avg: 10000,
    volume: 0,
    value: 0,
    foreignBuyVolume: 0,
    foreignSellVolume: 0,
    matchVolume: 0,
    bids: [],
    asks: [],
    ...over,
  };
}

function series(n: number, start: number, step: number): Bar[] {
  return Array.from({ length: n }, (_, i) => {
    const c = start + i * step;
    return { time: "2026-01-" + String(i).padStart(3, "0"), open: c, high: c, low: c, close: c, volume: 1, value: null };
  });
}

describe("computeBreadth", () => {
  it("buckets symbols by price against reference", () => {
    const b = computeBreadth([quote({ price: 10500 }), quote({ price: 9500 }), quote({ price: 10000 })], "HOSE", "2026-07-30");
    expect(b).toMatchObject({ exchange: "HOSE", date: "2026-07-30", advancing: 1, declining: 1, unchanged: 1, total: 3, advanceDeclineRatio: 1 });
  });

  it("counts ceiling and floor separately from advancing and declining", () => {
    const b = computeBreadth([quote({ price: 10700 }), quote({ price: 9300 })], "HOSE", "d");
    expect(b).toMatchObject({ advancing: 1, declining: 1, ceiling: 1, floor: 1 });
  });

  it("leaves out symbols that have not traded rather than calling them unchanged", () => {
    const b = computeBreadth([quote({ price: 0 }), quote({ ref: 0 }), quote({ price: 10100 })], "ALL", "d");
    expect(b).toMatchObject({ unchanged: 0, total: 1 });
  });

  it("reports a null ratio instead of Infinity when nothing declined", () => {
    expect(computeBreadth([quote({ price: 10100 })], "HOSE", "d").advanceDeclineRatio).toBeNull();
  });
});

describe("classifyRegime", () => {
  it("calls a rising series trending up and a falling one trending down", () => {
    expect(classifyRegime(series(60, 1500, 2)).regime).toBe("trending_up");
    expect(classifyRegime(series(60, 1500, -2)).regime).toBe("trending_down");
  });

  it("falls back to sideways without enough history", () => {
    expect(classifyRegime(series(30, 1500, 2))).toMatchObject({ regime: "sideways", rationale: expect.stringContaining("50") });
  });
});

describe("liquiditySignal", () => {
  it("flags heavy and light sessions against the 20-day norm", () => {
    expect(liquiditySignal(130, 100)).toBe("above_average");
    expect(liquiditySignal(70, 100)).toBe("below_average");
    expect(liquiditySignal(100, 100)).toBe("normal");
  });

  it("stays normal when there is no baseline", () => {
    expect(liquiditySignal(100, 0)).toBe("normal");
  });
});
