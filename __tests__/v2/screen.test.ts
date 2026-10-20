import {
  screen,
  toFilters,
  parseSort,
  statisticsFetcher,
  ScreenSource,
  applyFilters,
  isBoardField,
  isPrebuiltField,
  needsUpstream,
  pool,
  mergeStatistics,
} from "../../src/client/screen";
import { InvalidParameterError } from "../../src/errors";
import { Quote } from "../../src/types";
import { SymbolRatios } from "../../src/models/ratios";

function quote(symbol: string, over: Partial<Quote> = {}): Quote {
  return {
    symbol,
    name: symbol + " Corp",
    nameEn: symbol,
    exchange: "HOSE",
    price: 125800,
    change: 1200,
    changePct: 0.963,
    ref: 124600,
    ceiling: 0,
    floor: 0,
    high: 0,
    low: 0,
    avg: 0,
    volume: 3120000,
    value: 392496000000,
    foreignBuyVolume: 0,
    foreignSellVolume: 0,
    matchVolume: 0,
    bids: [],
    asks: [],
    ...over,
  };
}

const ratio = (symbol: string, roe: number): SymbolRatios => ({ symbol, roe, roa: 0.1, period: "2026Q2" }) as any;

const prebuiltRatios: Record<string, SymbolRatios> = { AAA: ratio("AAA", 0.3), BBB: ratio("BBB", 0.2), CCC: ratio("CCC", 0.1) };

const STATS: Record<string, any> = {
  AAA: { pe: 12, pb: 3, marketCap: 185000000000000 },
  BBB: { pe: 14, pb: 2, marketCap: 50000000000000 },
  CCC: { pe: 30, pb: 5, marketCap: 9000000000000 },
};

function fakeSource(over: Partial<ScreenSource> = {}) {
  const calls = { stats: [] as string[], groups: [] as string[] };
  const source: ScreenSource = {
    async fetchSymbolsByGroup(group) {
      calls.groups.push(group);
      return [{ symbol: "AAA" }, { symbol: "BBB" }, { symbol: "CCC" }];
    },
    async fetchQuotes(symbols) {
      return symbols.map((s, i) => quote(s, { price: 125800 - i * 1000 }));
    },
    async fetchSymbolsByIndustries() {
      return [{ symbol: "AAA", industry: "Công nghệ", industryEn: "Technology" }] as any;
    },
    async fetchStatistics(symbol) {
      calls.stats.push(symbol);
      return STATS[symbol] || null;
    },
    ...over,
  };
  return { source, calls };
}

describe("where and sort", () => {
  it("turns where into filters", () => {
    expect(toFilters({ pe: { lt: 15 }, roe: { gte: 0.15, lte: 0.5 }, exchange: { eq: "HOSE" } })).toEqual([
      { field: "pe", operator: "<", value: 15 },
      { field: "roe", operator: ">=", value: 0.15 },
      { field: "roe", operator: "<=", value: 0.5 },
      { field: "exchange", operator: "=", value: "HOSE" },
    ]);
  });

  it("rejects unknown operators with a hint", () => {
    try {
      toFilters({ pe: { below: 15 } as any });
      throw new Error("expected throw");
    } catch (e: any) {
      expect(e).toBeInstanceOf(InvalidParameterError);
      expect(e.hint).toMatch(/lt, lte, gt, gte, eq/);
    }
  });

  it("reads a leading minus as descending", () => {
    expect(parseSort("-roe")).toEqual({ sortBy: "roe", order: "desc" });
    expect(parseSort("pe")).toEqual({ sortBy: "pe", order: "asc" });
    expect(parseSort(undefined)).toEqual({ sortBy: undefined, order: "desc" });
  });
});

describe("screen", () => {
  it("accepts where-style filters and sort strings", async () => {
    const { source } = fakeSource();
    const rows = await screen(source, { group: "VN30", where: { pe: { lt: 15 }, roe: { gt: 0.15 } }, sort: "-roe", limit: 2 }, prebuiltRatios);
    expect(rows.map((r) => r.symbol)).toEqual(["AAA", "BBB"]);
  });

  it("reports price, value and market cap in dong", async () => {
    const { source } = fakeSource();
    const [row] = await screen(source, { group: "VN30", sort: "-marketCap", limit: 1 }, prebuiltRatios);
    expect(row.price).toBe(125800);
    expect(row.value).toBe(392496000000);
    expect(row.marketCap).toBe(185000000000000);
    expect(row.companyName).toBe("AAA Corp");
    expect(row.industryEn).toBe("Technology");
  });

  it("filters on prebuilt and board fields without per-symbol requests", async () => {
    const { source, calls } = fakeSource();
    const rows = await screen(source, { group: "VN30", where: { roe: { gte: 0.2 }, price: { gt: 124000 } } }, prebuiltRatios);
    expect(rows.map((r) => r.symbol)).toEqual(["AAA", "BBB"]);
    expect(calls.stats).toEqual([]);
  });

  it("asks for statistics only for symbols that survived the free filters", async () => {
    const { source, calls } = fakeSource();
    await screen(source, { group: "VN30", where: { roe: { gte: 0.2 }, pe: { lt: 100 } } }, prebuiltRatios);
    expect(calls.stats.sort()).toEqual(["AAA", "BBB"]);
  });

  it("falls back to per-symbol statistics when the prebuilt file is missing", async () => {
    const { source, calls } = fakeSource({
      async fetchStatistics(symbol) {
        calls.stats.push(symbol);
        return { ...STATS[symbol], roe: symbol === "CCC" ? 0.5 : 0.1 };
      },
    });
    const rows = await screen(source, { exchange: "HSX", where: { roe: { gt: 0.3 } } }, null);
    expect(rows.map((r) => r.symbol)).toEqual(["CCC"]);
    expect(calls.groups).toEqual(["HOSE"]);
  });

  it("drops a symbol whose statistics cannot be read instead of failing the screen", async () => {
    const { source } = fakeSource({
      async fetchStatistics(symbol) {
        if (symbol === "AAA") throw new Error("429");
        return STATS[symbol];
      },
    });
    const rows = await screen(source, { group: "VN30", where: { pe: { lt: 100 } } }, prebuiltRatios);
    expect(rows.map((r) => r.symbol).sort()).toEqual(["BBB", "CCC"]);
  });

  it("hints at the old filter shape and requires a universe", async () => {
    const { source } = fakeSource();
    await expect(screen(source, { group: "VN30", filters: [] } as any, null)).rejects.toMatchObject({ hint: expect.stringContaining("where") });
    await expect(screen(source, { group: "VN30", sortBy: "roe" } as any, null)).rejects.toMatchObject({ hint: expect.stringContaining("sort") });
    await expect(screen(source, {}, null)).rejects.toBeInstanceOf(InvalidParameterError);
  });

  it("returns nothing for an empty universe", async () => {
    const { source } = fakeSource({ fetchSymbolsByGroup: async () => [] });
    expect(await screen(source, { group: "VN30" }, null)).toEqual([]);
  });
});

describe("statisticsFetcher", () => {
  it("reads the newest statistics row once per symbol within the TTL", async () => {
    const urls: string[] = [];
    const fetcher = statisticsFetcher({
      async request<T>(c: any): Promise<T> {
        urls.push(c.url);
        return { data: [{ pe: 10 }, { pe: 12 }] } as any;
      },
    });
    expect(await fetcher("FPT")).toEqual({ pe: 12 });
    expect(await fetcher("FPT")).toEqual({ pe: 12 });
    expect(urls).toEqual(["https://iq.vietcap.com.vn/api/iq-insight-service/v1/company/FPT/statistics-financial"]);
  });

  it("answers null when the upstream fails", async () => {
    const fetcher = statisticsFetcher({
      async request<T>(): Promise<T> {
        throw new Error("down");
      },
    });
    expect(await fetcher("FPT")).toBeNull();
  });
});

// Restated from the v1 screening tests: the shared filter code now lives in src/client/screen.ts.

describe("applyFilters", () => {
  const rows = [
    { symbol: "A", pe: 10, roe: 0.2, exchange: "HOSE" },
    { symbol: "B", pe: 15, roe: 0.1, exchange: "HNX" },
    { symbol: "C", pe: 20, roe: null as number | null, exchange: "HOSE" },
  ];

  it("supports every operator and treats a missing value as failing", () => {
    expect(applyFilters(rows, [{ field: "pe", operator: "<", value: 15 }]).map((r) => r.symbol)).toEqual(["A"]);
    expect(applyFilters(rows, [{ field: "pe", operator: ">", value: 15 }]).map((r) => r.symbol)).toEqual(["C"]);
    expect(applyFilters(rows, [{ field: "pe", operator: "<=", value: 15 }]).map((r) => r.symbol)).toEqual(["A", "B"]);
    expect(applyFilters(rows, [{ field: "pe", operator: ">=", value: 15 }]).map((r) => r.symbol)).toEqual(["B", "C"]);
    expect(applyFilters(rows, [{ field: "exchange", operator: "=", value: "HNX" }]).map((r) => r.symbol)).toEqual(["B"]);
    expect(applyFilters(rows, [{ field: "roe", operator: ">", value: 0 }]).map((r) => r.symbol)).toEqual(["A", "B"]);
  });

  it("ANDs criteria, keeps everything without filters, sorts and limits", () => {
    expect(
      applyFilters(rows, [
        { field: "pe", operator: "<", value: 20 },
        { field: "exchange", operator: "=", value: "HOSE" },
      ]).map((r) => r.symbol)
    ).toEqual(["A"]);
    expect(applyFilters(rows, [])).toHaveLength(3);
    expect(applyFilters(rows, [], { sortBy: "pe" }).map((r) => r.symbol)).toEqual(["C", "B", "A"]);
    expect(applyFilters(rows, [], { sortBy: "pe", order: "asc" }).map((r) => r.symbol)).toEqual(["A", "B", "C"]);
    expect(applyFilters(rows, [], { limit: 2 })).toHaveLength(2);
  });
});

describe("field cost", () => {
  it("knows which fields the board carries and which need the prebuilt file or a request", () => {
    expect(isBoardField("price")).toBe(true);
    expect(isBoardField("value")).toBe(true);
    expect(isBoardField("pe")).toBe(false);
    expect(isPrebuiltField("roe")).toBe(true);
    expect(needsUpstream("roe", true)).toBe(false);
    expect(needsUpstream("roe", false)).toBe(true);
    expect(needsUpstream("pe", true)).toBe(true);
  });
});

describe("pool", () => {
  it("never exceeds its concurrency and keeps results in input order", async () => {
    let inFlight = 0;
    let peak = 0;
    const out = await pool([30, 10, 20, 5, 15], 2, async (ms) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, ms));
      inFlight--;
      return ms * 2;
    });
    expect(peak).toBeLessThanOrEqual(2);
    expect(out).toEqual([60, 20, 40, 10, 30]);
    expect(await pool([], 3, async (x) => x)).toEqual([]);
  });
});

describe("mergeStatistics", () => {
  const row = () => ({ symbol: "A", marketCap: 0, pe: null, debtToEquity: null }) as any;

  it("keeps market cap in dong and accepts either spelling of debt to equity", () => {
    const r = row();
    mergeStatistics(r, { marketCap: 185e12, debtPerEquity: 0.4, pe: 12 });
    expect(r).toMatchObject({ marketCap: 185e12, debtToEquity: 0.4, pe: 12 });
  });

  it("leaves the row untouched without statistics and rejects non-finite numbers", () => {
    const r = row();
    mergeStatistics(r, null);
    expect(r.pe).toBeNull();
    mergeStatistics(r, { pe: NaN, roe: Infinity });
    expect(r.pe).toBeNull();
    expect(r.roe).toBeNull();
  });
});
