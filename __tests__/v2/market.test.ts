import {
  symbolFlow,
  marketFlow,
  liquidityOf,
  averageLiquidityOf,
  indexSnapshot,
  breadthOf,
  indexHistory,
  liquidity,
  breadth,
  foreignFlow,
  symbolForeignFlow,
  overview,
  marketContext,
  MarketSource,
} from "../../src/client/market";
import { InvalidParameterError } from "../../src/errors";
import { Bar, Quote } from "../../src/types";
import { BarsParams } from "../../src/adapters/types";

const NOW = Date.parse("2026-07-30T08:00:00Z");

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

function bar(over: Partial<Bar>): Bar {
  return { time: "2026-07-30", open: 1600, high: 1600, low: 1600, close: 1600, volume: 1, value: null, ...over };
}

function series(n: number, start: number, step: number, value = 20e12): Bar[] {
  const t0 = Date.UTC(2026, 0, 1);
  return Array.from({ length: n }, (_, i) => {
    const c = start + i * step;
    return bar({ time: new Date(t0 + i * 86400000).toISOString().substring(0, 10), open: c, high: c, low: c, close: c, value });
  });
}

describe("dong-valued helpers", () => {
  it("values foreign flow as volume x average price in dong", () => {
    const flow = symbolFlow(quote({ symbol: "VCB", avg: 50000, foreignBuyVolume: 1_000_000 }), "2026-07-30");
    expect(flow).toMatchObject({ symbol: "VCB", buyValue: 50e9, sellValue: 0, netValue: 50e9, unit: "VND" });
  });

  it("nets buy against sell and falls back to the match price", () => {
    expect(symbolFlow(quote({ avg: 10000, foreignBuyVolume: 3_000_000, foreignSellVolume: 1_000_000 }), "d")).toMatchObject({
      netVolume: 2_000_000,
      netValue: 20e9,
    });
    expect(symbolFlow(quote({ avg: 0, price: 20000, foreignBuyVolume: 1_000_000 }), "d").buyValue).toBe(20e9);
  });

  describe("marketFlow", () => {
    const quotes = [
      quote({ symbol: "BUY1", foreignBuyVolume: 5_000_000 }),
      quote({ symbol: "BUY2", foreignBuyVolume: 2_000_000 }),
      quote({ symbol: "SELL1", foreignSellVolume: 4_000_000 }),
      quote({ symbol: "QUIET" }),
      quote({ symbol: "DEAD", price: 0, foreignBuyVolume: 9_000_000 }),
    ];

    it("aggregates the board in dong", () => {
      expect(marketFlow(quotes, "HOSE", "2026-07-30")).toMatchObject({ buyValue: 70e9, sellValue: 40e9, netValue: 30e9, netVolume: 3_000_000, unit: "VND" });
    });

    it("ranks top net buy descending and top net sell most-negative first, skipping quiet and untraded symbols", () => {
      const r = marketFlow(quotes, "HOSE", "2026-07-30");
      expect(r.topNetBuy.map((f) => f.symbol)).toEqual(["BUY1", "BUY2"]);
      expect(r.topNetSell.map((f) => f.symbol)).toEqual(["SELL1"]);
    });

    it("honours the top limit", () => {
      const many = [1, 2, 3, 4, 5].map((n) => quote({ symbol: `S${n}`, foreignBuyVolume: n * 1_000_000 }));
      expect(marketFlow(many, "HOSE", "2026-07-30", 2).topNetBuy.map((f) => f.symbol)).toEqual(["S5", "S4"]);
    });
  });

  it("reads liquidity in dong from the index bars", () => {
    const r = liquidityOf([bar({ time: "2026-07-29", value: 10e12 }), bar({ time: "2026-07-30", value: 20e12 })], "VNINDEX");
    expect(r).toMatchObject({ index: "VNINDEX", date: "2026-07-30", value: 20e12, valuePrevious: 10e12, changePercent: 100, unit: "VND" });
    expect(liquidityOf([bar({ value: 1e12 })], "VNINDEX")).toMatchObject({ valuePrevious: null, changePercent: null });
    expect(liquidityOf([bar({ value: null })], "VNINDEX").value).toBe(0);
  });

  it("averages the most recent bars that carry a value", () => {
    expect(averageLiquidityOf([bar({ value: 1e12 }), bar({ value: 2e12 }), bar({ value: 3e12 })], 3)).toBe(2e12);
    expect(averageLiquidityOf([bar({ value: null }), bar({ value: 4e12 })], 20)).toBe(4e12);
    expect(averageLiquidityOf([], 20)).toBe(0);
  });

  it("snapshots the index in points", () => {
    const snap = indexSnapshot([bar({ time: "2026-07-29", close: 1600 }), bar({ time: "2026-07-30", close: 1680 })], "VNINDEX");
    expect(snap).toMatchObject({ date: "2026-07-30", close: 1680, change: 80, changePercent: 5 });
    expect(() => indexSnapshot([], "VNINDEX")).toThrow(/No index bars/);
  });

  it("counts breadth on quotes in dong", () => {
    const b = breadthOf(
      [quote({ price: 10700 }), quote({ price: 10500 }), quote({ price: 9300 }), quote({ price: 10000 }), quote({ price: 0 })],
      "HOSE",
      "2026-07-30"
    );
    expect(b).toMatchObject({ advancing: 2, declining: 1, unchanged: 1, ceiling: 1, floor: 1, total: 4, advanceDeclineRatio: 2 });
  });
});

function fakeSource(opts: { boards?: Record<string, Quote[]>; index?: Bar[] } = {}) {
  const calls = { bars: [] as BarsParams[], groups: [] as string[], quotes: [] as string[][] };
  const boards = opts.boards || {};
  const source: MarketSource = {
    async fetchBars(p) {
      calls.bars.push(p);
      const out: Record<string, Bar[]> = {};
      for (const s of p.symbols) out[s] = opts.index || [];
      return out;
    },
    async fetchSymbolsByGroup(group) {
      calls.groups.push(group);
      return (boards[group] || []).map((q) => ({ symbol: q.symbol }));
    },
    async fetchQuotes(symbols) {
      calls.quotes.push(symbols);
      const all = Object.values(boards).flat();
      return symbols.map((s) => all.find((q) => q.symbol === s) as Quote);
    },
  };
  return { source, calls };
}

describe("market module", () => {
  const index = series(60, 1500, 2);
  const boards = {
    HOSE: [quote({ symbol: "FPT", price: 10500, foreignBuyVolume: 1_000_000 }), quote({ symbol: "VCB", price: 9500, foreignSellVolume: 500_000 })],
    HNX: [quote({ symbol: "SHS", exchange: "HNX", price: 10000 })],
    UPCOM: [quote({ symbol: "BSR", exchange: "UPCOM", price: 10100 })],
  };

  it("reads index history in points with a padded daily window", async () => {
    const { source, calls } = fakeSource({ index });
    const bars = await indexHistory(source, "vnindex", { countBack: 30, now: NOW });
    expect(bars).toBe(index);
    expect(calls.bars[0]).toMatchObject({ symbols: ["VNINDEX"], to: "2026-07-30", frame: "ONE_DAY", countBack: 30 });
    await expect(indexHistory(source, "FPT")).rejects.toBeInstanceOf(InvalidParameterError);
  });

  it("labels breadth and foreign flow with the index session date", async () => {
    const { source } = fakeSource({ index, boards });
    const b = await breadth(source, { now: NOW });
    expect(b).toMatchObject({ exchange: "HOSE", date: index[59].time, advancing: 1, declining: 1 });
    const f = await foreignFlow(source, { now: NOW });
    expect(f).toMatchObject({ exchange: "HOSE", buyValue: 10e9, sellValue: 5e9, netValue: 5e9, unit: "VND" });
  });

  it("reads HSX as HOSE and ALL as every exchange", async () => {
    const { source, calls } = fakeSource({ index, boards });
    expect((await breadth(source, { exchange: "HSX" as any, now: NOW })).exchange).toBe("HOSE");
    expect(calls.groups).toEqual(["HOSE"]);
    expect((await breadth(source, { exchange: "ALL", now: NOW })).total).toBe(4);
    await expect(breadth(source, { exchange: "NYSE" as any })).rejects.toBeInstanceOf(InvalidParameterError);
  });

  it("gives per-symbol foreign flow and rejects unknown symbols", async () => {
    const { source } = fakeSource({ index, boards });
    expect(await symbolForeignFlow(source, "fpt", { now: NOW })).toMatchObject({ symbol: "FPT", buyValue: 10e9, unit: "VND" });
    await expect(symbolForeignFlow(source, "XYZ", { now: NOW })).rejects.toBeInstanceOf(InvalidParameterError);
  });

  it("builds an overview from one board fetch", async () => {
    const { source, calls } = fakeSource({ index, boards });
    const o = await overview(source, { now: NOW });
    expect(o.date).toBe(index[59].time);
    expect(o.liquidity).toMatchObject({ value: 20e12, unit: "VND" });
    expect(o.breadth.total).toBe(2);
    expect(o.foreign.netValue).toBe(5e9);
    expect(calls.groups).toEqual(["HOSE"]);
  });

  it("reads liquidity for the requested index", async () => {
    const { source } = fakeSource({ index });
    expect(await liquidity(source, { index: "VN30", now: NOW })).toMatchObject({ index: "VN30", value: 20e12 });
  });

  it("builds a market context with regime and liquidity against its norm", async () => {
    const { source } = fakeSource({ index, boards });
    const ctx = await marketContext(source, { now: NOW });
    expect(ctx.regime).toBe("trending_up");
    expect(ctx.liquidity).toMatchObject({ value: 20e12, avg20: 20e12, ratio: 1, signal: "normal", unit: "VND" });
    expect(ctx.breadth).not.toBeNull();
    expect(ctx.notes).toEqual([]);
  });

  it("omits breadth and foreign flow for a past session and says why", async () => {
    const { source, calls } = fakeSource({ index, boards });
    const ctx = await marketContext(source, { asOf: "2026-02-20", now: NOW });
    expect(calls.bars[0].to).toBe("2026-02-20");
    expect(ctx.breadth).toBeNull();
    expect(ctx.foreign).toBeNull();
    expect(ctx.notes[0]).toMatch(/asOf=2026-02-20/);
    expect(calls.groups).toEqual([]);
  });
});
