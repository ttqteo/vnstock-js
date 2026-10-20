import { createClient, ClientOptions } from "../../src/client";
import { fakeRealtime, realtimeQuote } from "./fake-realtime";
import { memoryStorage } from "../../src/storage";
import { InvalidParameterError } from "../../src/errors";
import { Bar, Quote } from "../../src/types";

const NOW = Date.parse("2026-10-14T03:00:00Z");
const FOREIGN = "https://raw.githubusercontent.com/ttqteo/vnstock-js/master/data/foreign";

function foreignServer() {
  const day = (date: string, rows: any[]) => ({ date, rows, totals: {} });
  const files: Record<string, unknown> = {
    "index.json": { months: ["2026-09", "2026-10"] },
    "2026/09.json": {
      month: "2026-09",
      days: [day("2026-09-01", [["FPT", "HOSE", 1, 0, 127000, 0]]), day("2026-09-15", [["FPT", "HOSE", 100, 40, 12700000, 5080000]])],
    },
    "2026/10.json": { month: "2026-10", days: [day("2026-10-13", [["SHS", "HNX", 10, 0, 200000, 0]])] },
  };
  return async (url: any) => {
    const key = String(url).replace(FOREIGN + "/", "");
    return key in files ? new Response(JSON.stringify(files[key])) : new Response("", { status: 404 });
  };
}

const day = (time: string, c: number): Bar => ({ time, open: c, high: c, low: c, close: c, volume: 100, value: c * 100 });

function trend(n: number, start: number): Bar[] {
  const t0 = Date.UTC(2026, 0, 1);
  return Array.from({ length: n }, (_, i) => day(new Date(t0 + i * 86400000).toISOString().substring(0, 10), start * (1 + 0.002 * i)));
}

function quote(symbol: string, over: Partial<Quote> = {}): Quote {
  return {
    symbol,
    name: symbol + " Corp",
    nameEn: symbol,
    exchange: "HOSE",
    price: 127000,
    change: 1000,
    changePct: 0.794,
    ref: 126000,
    ceiling: 134800,
    floor: 117200,
    high: 0,
    low: 0,
    avg: 127000,
    volume: 1000,
    value: 127000000,
    foreignBuyVolume: 1000,
    foreignSellVolume: 0,
    matchVolume: 0,
    bids: [],
    asks: [],
    ...over,
  };
}

const SYMBOLS = [
  { symbol: "FPT", exchange: "HSX", companyName: "FPT Corp", companyNameEn: "FPT", industry: "Công nghệ", industryEn: "Technology", vn30: true },
  { symbol: "VCB", exchange: "HSX", companyName: "Vietcombank", companyNameEn: "Vietcombank", industry: "Ngân hàng", industryEn: "Banks", vn30: true },
  { symbol: "SHS", exchange: "HNX", companyName: "Chứng khoán SHS", companyNameEn: "SHS", industry: "Chứng khoán", industryEn: "Securities", vn30: false },
];

function fakeSource(bars: (symbol: string, p: any) => Bar[] = () => [day("2026-10-12", 125000), day("2026-10-13", 126000), day("2026-10-14", 127000)]) {
  const calls: any[] = [];
  const source = {
    calls,
    async fetchBars(p: any) {
      calls.push(p);
      return { [p.symbols[0]]: bars(p.symbols[0], p) };
    },
    async fetchQuotes(symbols: string[]) {
      return symbols.map((s) => quote(s));
    },
    async fetchSymbolsByGroup(group: string) {
      return (group === "VN30" || group === "HOSE" ? ["FPT", "VCB"] : ["SHS"]).map((symbol) => ({ symbol }));
    },
    async fetchSymbolsByIndustries() {
      return [];
    },
    async fetchCompanyOverview() {
      calls.push("overview");
      return {
        CompanyListingInfo: { issueShare: 1471000000 },
        OrganizationShareHolders: [{ ticker: "FPT", ownerFullName: "A" }],
        OrganizationEvents: [{ id: "e1", eventListCode: "DIVIDEND_CASH" }],
      };
    },
    async fetchFinancialReport() {
      return {
        data: { years: [{ yearReport: 2025, lengthReport: 5, isa1: 7.02e13 }], quarters: [], ratio: [] },
        mapping: { ratio: { fields: [{ field: "isa1" }] }, unit: {} },
      };
    },
    async fetchStatistics() {
      return { pe: 12, marketCap: 185e12 };
    },
  };
  return source;
}

function client(src = fakeSource(), transport?: any, extra: Partial<ClientOptions> = {}) {
  return createClient({
    storage: memoryStorage(),
    now: () => NOW,
    fetch: transport,
    _source: src as any,
    _datasets: { symbols: async () => SYMBOLS as any, holidays: async () => ({ "2026": ["2026-09-02"] }), ratios: async () => null },
    ...extra,
  });
}

const flush = () => new Promise((r) => setImmediate(r));

describe("stock handle", () => {
  it("creates handles synchronously without network", () => {
    const src = fakeSource();
    client(src).stock("fpt");
    expect(src.calls).toEqual([]);
  });

  it("history accepts a range", async () => {
    const src = fakeSource();
    const bars = await client(src).stock("FPT").history("6mo");
    expect(bars).toHaveLength(3);
    expect(src.calls[0]).toMatchObject({ symbols: ["FPT"], from: "2026-04-14", to: "2026-10-14", frame: "ONE_DAY" });
  });

  it("history resamples non-native intervals", async () => {
    const bars = await client().stock("FPT").history({ from: "2026-10-01", interval: "1w" });
    expect(bars).toHaveLength(1);
    expect(bars[0].close).toBe(127000);
  });

  it("5d and 1d trim to the last sessions", async () => {
    expect((await client().stock("FPT").history("5d")).length).toBeLessThanOrEqual(5);
    expect(await client().stock("FPT").history("1d")).toEqual([day("2026-10-14", 127000)]);
  });

  it("returns the intraday bars that exist when a range reaches past the source's depth", async () => {
    const src = fakeSource(() => [{ ...day("2026-10-14T09:15:00+07:00", 127000) }]);
    const bars = await client(src).stock("FPT").history({ from: "2026-01-01", interval: "15m" });
    expect(src.calls[0].frame).toBe("ONE_MINUTE");
    expect(bars).toHaveLength(1);
  });

  it("price returns one quote", async () => {
    expect(await client().stock("FPT").price()).toMatchObject({ symbol: "FPT", price: 127000 });
  });

  it("unknown symbols fail on first call with a suggestion", async () => {
    await expect(client().stock("FTP").price()).rejects.toMatchObject({ code: "INVALID_SYMBOL", hint: 'Did you mean "FPT"?' });
  });

  it("company sections share one overview request", async () => {
    const src = fakeSource();
    const fpt = client(src).stock("FPT");
    expect(await fpt.company()).toMatchObject({ symbol: "FPT", issuedShares: 1471000000 });
    expect((await fpt.shareholders())[0]).toMatchObject({ symbol: "FPT", name: "A" });
    expect((await fpt.dividends()).map((e) => e.id)).toEqual(["e1"]);
    expect(await fpt.officers()).toEqual([]);
    expect(await fpt.events()).toHaveLength(1);
    expect(await fpt.news()).toEqual([]);
    expect(src.calls.filter((c) => c === "overview")).toHaveLength(1);
  });

  it("financials returns statements in dong", async () => {
    const st = await client().stock("FPT").financials("income", { period: "year" });
    expect(st.rows[0].values.isa1).toBe(7.02e13);
  });

  it("foreign returns the current session, or the recorded sessions of a range", async () => {
    expect(await client().stock("FPT").foreign()).toMatchObject({ symbol: "FPT", date: "2026-10-14", buyValue: 127000000, unit: "VND" });
    const days = await client(fakeSource(), foreignServer()).stock("FPT").foreign("1mo");
    expect(days.map((d) => [d.date, d.netValue])).toEqual([
      ["2026-09-15", 7620000],
      ["2026-10-13", 0],
    ]);
    expect((await client(fakeSource(), foreignServer()).stock("FPT").foreign("1d")).map((d) => d.date)).toEqual(["2026-10-13"]);
  });

  it("context and prompt use daily bars up to asOf", async () => {
    const src = fakeSource(() => trend(260, 100000));
    const fpt = client(src).stock("FPT");
    const ctx = await fpt.context({ asOf: "2026-06-30" });
    expect(ctx.asOf).toBe("2026-06-30");
    expect(await fpt.prompt({ lang: "en" })).toMatch(/^=== FPT · /);
  });
});

describe("index handle", () => {
  it("keeps points and derives the price from the last two sessions", async () => {
    const src = fakeSource(() => [day("2026-10-13", 1700), day("2026-10-14", 1717)]);
    const vnindex = client(src).index("vnindex");
    const q = await vnindex.price();
    expect(q).toMatchObject({ symbol: "VNINDEX", price: 1717, ref: 1700, change: 17, changePct: 1 });
    expect((await vnindex.history("5d")).map((b) => b.close)).toEqual([1700, 1717]);
  });

  it("rejects stock symbols with a suggestion", async () => {
    await expect(client().index("VNINDX").price()).rejects.toMatchObject({ code: "INVALID_SYMBOL", hint: 'Did you mean "VNINDEX"?' });
  });
});

describe("client", () => {
  it("prices accepts arrays, groups and exchanges", async () => {
    expect((await client().prices(["fpt", "VCB"])).map((x) => x.symbol)).toEqual(["FPT", "VCB"]);
    expect((await client().prices({ group: "VN30" })).map((x) => x.symbol)).toEqual(["FPT", "VCB"]);
    expect((await client().prices({ exchange: "HSX" })).map((x) => x.symbol)).toEqual(["FPT", "VCB"]);
  });

  it("market gives an overview, or a context for a past session", async () => {
    const src = fakeSource(() => trend(60, 1500));
    const vn = client(src);
    const o = await vn.market();
    expect(o.liquidity.unit).toBe("VND");
    expect("breadth" in o && o.breadth.total).toBe(2);
    const ctx = await vn.market({ asOf: "2026-02-20" });
    expect(ctx.breadth).toBeNull();
    expect((await vn.market.breadth()).advancing).toBe(2);
    expect((await vn.market.liquidity()).index).toBe("VNINDEX");
    expect((await vn.market.foreign({ top: 1 })).topNetBuy).toHaveLength(1);
  });

  it("market.foreign with a range sums the recorded sessions of an exchange", async () => {
    const vn = client(fakeSource(), foreignServer());
    const all = await vn.market.foreign({ range: "1mo", exchange: "ALL" });
    expect(all.map((d) => [d.date, d.netValue])).toEqual([
      ["2026-09-15", 7620000],
      ["2026-10-13", 200000],
    ]);
    expect((await vn.market.foreign({ range: "1mo" }))[1]).toMatchObject({ exchange: "HOSE", netValue: 0 });
  });

  it("market.intraday reads minute bars of VNINDEX and the board", async () => {
    const src = fakeSource((s, p) => (p.frame === "ONE_MINUTE" ? [{ ...day("2026-10-14T09:15:00+07:00", 1700), value: 5e12 }] : [day("2026-10-14", 1700)]));
    const d = await client(src).market.intraday();
    expect(src.calls[0]).toMatchObject({ symbols: ["VNINDEX"], frame: "ONE_MINUTE" });
    expect(d.points).toHaveLength(1);
    expect(d.liquidity.value).toBe(5e12);
    expect(d.breadth.exchange).toBe("HOSE");
  });

  it("screen runs where filters with per-symbol statistics", async () => {
    const rows = await client().screen({ group: "VN30", where: { pe: { lt: 15 } }, sort: "-marketCap" });
    expect(rows.map((r) => r.symbol)).toEqual(["FPT", "VCB"]);
    expect(rows[0].marketCap).toBe(185e12);
  });

  it("screen keeps a class source's prototype methods", async () => {
    // VciAdapter is a class: spreading it into a plain object would drop its methods.
    const rows = await client(Object.create(fakeSource())).screen({ group: "VN30", where: { pe: { lt: 15 } } });
    expect(rows.map((r) => r.symbol)).toEqual(["FPT", "VCB"]);
  });

  it("search and symbols read the symbol dataset", async () => {
    const vn = client();
    expect((await vn.search("fpt")).map((s) => s.symbol)).toEqual(["FPT"]);
    expect((await vn.symbols({ exchange: "HOSE" })).map((s) => s.symbol)).toEqual(["FPT", "VCB"]);
    expect((await vn.symbols({ industry: "bank" })).map((s) => s.symbol)).toEqual(["VCB"]);
    expect((await vn.symbols({ group: "HNX30" })).map((s) => s.symbol)).toEqual(["SHS"]);
    expect(await vn.symbols()).toHaveLength(3);
  });

  it("symbols and search report HOSE, never VCI's HSX", async () => {
    const vn = client();
    expect((await vn.search("fpt"))[0].exchange).toBe("HOSE");
    expect((await vn.symbols()).map((s) => s.exchange)).toEqual(["HOSE", "HOSE", "HNX"]);
    expect((await vn.symbols({ exchange: "HSX" })).map((s) => s.symbol)).toEqual(["FPT", "VCB"]);
  });

  it("calendar answers from the holiday dataset", async () => {
    const vn = client();
    expect(await vn.calendar.isTradingDay("2026-09-02")).toBe(false);
    expect(await vn.calendar.next("2026-09-01")).toBe("2026-09-03");
    expect(await vn.calendar.previous()).toBe("2026-10-13");
    await expect(vn.calendar.isTradingDay("2/9/2026")).rejects.toBeInstanceOf(InvalidParameterError);
  });

  it("gold, fx and news go through the client transport", async () => {
    const urls: string[] = [];
    const fakeFetch = async (url: any) => {
      urls.push(String(url));
      if (String(url).includes("btmc"))
        return new Response(JSON.stringify({ DataList: { Data: [{ "@n_1": "SJC", "@pb_1": "12300000", "@ps_1": "12500000" }] } }));
      if (String(url).includes("vietcombank")) return new Response(JSON.stringify({ Data: [{ currencyCode: "USD", cash: "25,880.00" }] }));
      return new Response(JSON.stringify({ a: { item_id: "a", title: "x", published: "2026-10-14" } }));
    };
    const vn = client(fakeSource(), fakeFetch);
    expect((await vn.gold()).items[0].buy).toBe(123000000);
    expect((await vn.fx())[0].buyCash).toBe(25880);
    expect((await vn.news({ date: "2026-10-14" }))[0].id).toBe("a");
    expect(urls).toHaveLength(3);
  });
});

describe("patterns and health", () => {
  it("stock patterns run the detectors on a year of daily bars", async () => {
    const src = fakeSource(() => trend(260, 100000));
    const p = await client(src).stock("FPT").patterns({ recent: 5 });
    expect(src.calls[0]).toMatchObject({ symbols: ["FPT"], from: "2025-10-14", to: "2026-10-14", frame: "ONE_DAY" });
    expect(Object.keys(p).sort()).toEqual(["breakouts", "candles", "extreme", "turtle", "zones"]);
    expect(p.turtle?.action).toBe("buy");
  });

  it("index health reads the index and reports a status", async () => {
    const src = fakeSource(() => trend(260, 1200));
    const h = await client(src).index("VNINDEX").health();
    expect(src.calls[0].symbols).toEqual(["VNINDEX"]);
    expect(["uptrend", "pressure", "correction"]).toContain(h.status);
    expect(Array.isArray(h.events)).toBe(true);
  });

  it("patterns check the symbol first", async () => {
    await expect(client().stock("FTP").patterns()).rejects.toMatchObject({ code: "INVALID_SYMBOL" });
  });
});

describe("client additions for the CLI and MCP", () => {
  it("topMovers reads gainers and losers in dong through the transport", async () => {
    const bodies: any[] = [];
    const fakeFetch = async (_url: any, init: any) => {
      bodies.push(JSON.parse(init.body));
      const type = JSON.parse(init.body).topStockType;
      return new Response(
        JSON.stringify([{ stockCode: type === 1 ? "FPT" : "VCB", lastPrice1DayAgo: 125800, group: "HOSE", marketCap: 185e6, liquidity: 3e5 }])
      );
    };
    const m = await client(fakeSource(), fakeFetch).topMovers({ limit: 1 });
    expect(m.gainers).toEqual([
      { symbol: "FPT", exchange: "HOSE", price1DayAgo: 125800, price5DaysAgo: null, price20DaysAgo: null, marketCap: 185e12, liquidity: 3e11 },
    ]);
    expect(m.losers[0].symbol).toBe("VCB");
    expect(bodies.map((b) => b.timeFrame)).toEqual(["ONE_DAY", "ONE_DAY"]);
  });

  it("calendar.holidays lists one year", async () => {
    expect(await client().calendar.holidays(2026)).toEqual(["2026-09-02"]);
    expect(await client().calendar.holidays(2030)).toEqual([]);
  });

  it("market.context builds the market context for the current session", async () => {
    const ctx = await client(fakeSource(() => trend(60, 1500))).market.context();
    expect(ctx.regime).toBe("trending_up");
    expect(ctx.breadth).not.toBeNull();
  });
});

describe("portfolio", () => {
  it("values positions at live prices in dong", async () => {
    const p = await client().portfolio({ positions: [{ symbol: "fpt", quantity: 100, cost: 120000, broker: "DNSE" }], cash: { DNSE: 1000000 } });
    expect(p.positions[0]).toMatchObject({ symbol: "FPT", price: 127000, value: 12700000, pnl: 700000, industry: "Công nghệ" });
    expect(p.totals).toMatchObject({ value: 12700000, cash: 1000000, nav: 13700000 });
    expect(p.byBroker.DNSE.nav).toBe(13700000);
    expect(p.date).toBe("2026-10-14");
  });

  it("rejects unknown symbols with a suggestion before asking for prices", async () => {
    const src = fakeSource();
    const spy = jest.spyOn(src, "fetchQuotes");
    await expect(client(src).portfolio({ positions: [{ symbol: "FTP", quantity: 1, cost: 1 }] })).rejects.toMatchObject({
      code: "INVALID_SYMBOL",
      hint: 'Did you mean "FPT"?',
    });
    expect(spy).not.toHaveBeenCalled();
  });

  it("saves to and loads from the client storage", async () => {
    const vn = client();
    expect(await vn.portfolio.load()).toEqual({ positions: [] });
    const input = { positions: [{ symbol: "FPT", quantity: 100, cost: 120000 }], cash: 5000000 };
    await vn.portfolio.save(input);
    expect(await vn.portfolio.load()).toEqual(input);
    await expect(vn.portfolio.save({ positions: [{ symbol: "FPT", quantity: 0, cost: 1 }] })).rejects.toMatchObject({ code: "INVALID_PARAMETER" });
  });

  it("refuses a stored portfolio it cannot read", async () => {
    const storage = memoryStorage();
    await storage.set("portfolio", "{not json");
    const vn = createClient({
      storage,
      now: () => NOW,
      _source: fakeSource() as any,
      _datasets: { symbols: async () => SYMBOLS as any, holidays: async () => ({}), ratios: async () => null },
    });
    await expect(vn.portfolio.load()).rejects.toMatchObject({ code: "PARSE_ERROR" });
  });
});

describe("watch", () => {
  it("stock and client watchers share one stream after the symbol check", async () => {
    const rt = fakeRealtime();
    const vn = client(fakeSource(), undefined, { _realtime: () => rt });
    const seen: string[] = [];
    const stop1 = vn.stock("FPT").watch((t) => seen.push(t.symbol));
    const stop2 = vn.watch(["vcb"], (t) => seen.push(t.symbol));
    expect(rt.calls).toEqual([]);
    await flush();
    expect(rt.calls[0]).toEqual(["connect"]);
    expect(rt.calls.slice(1).map(String).sort()).toEqual(["sub,FPT", "sub,VCB"]);
    rt.emit("quote", realtimeQuote("VCB", 59300));
    expect(seen).toEqual(["VCB"]);
    stop1();
    stop2();
    expect(rt.calls[rt.calls.length - 1]).toEqual(["disconnect"]);
  });

  it("reports unknown symbols to onError and never connects", async () => {
    const rt = fakeRealtime();
    const vn = client(fakeSource(), undefined, { _realtime: () => rt });
    const errs: any[] = [];
    vn.watch(["FPT", "FTP"], () => undefined, { onError: (e) => errs.push(e) });
    vn.stock("VCBB").watch(() => undefined, { onError: (e) => errs.push(e) });
    await flush();
    expect(errs.map((e) => e.code)).toEqual(["INVALID_SYMBOL", "INVALID_SYMBOL"]);
    expect(errs.find((e) => e.message.includes("FTP")).hint).toBe('Did you mean "FPT"?');
    expect(rt.calls).toEqual([]);
  });

  it("polls the price board through the source in poll mode", async () => {
    const ticks: number[] = [];
    const stop = client().watch(["FPT"], (t) => ticks.push(t.price), { mode: "poll" });
    await flush();
    stop();
    expect(ticks).toEqual([127000]);
  });

  it("alert fires on a breakout over the shared stream after the symbol check", async () => {
    const rt = fakeRealtime();
    const vn = client(fakeSource(), undefined, { _realtime: () => rt });
    const events: any[] = [];
    const stop = vn.stock("FPT").alert({ when: "breakout", lookback: 2 }, (e) => events.push(e));
    await flush();
    await flush();
    rt.emit("quote", realtimeQuote("FPT", 126500));
    expect(events).toMatchObject([{ symbol: "FPT", rule: "breakout", price: 126500, level: 126000 }]);
    stop();
    expect(rt.calls[rt.calls.length - 1]).toEqual(["disconnect"]);
  });

  it("alert reports an unknown symbol to onError and never connects", async () => {
    const rt = fakeRealtime();
    const errs: any[] = [];
    client(fakeSource(), undefined, { _realtime: () => rt })
      .stock("FTP")
      .alert({ when: "breakout", onError: (e) => errs.push(e) }, () => undefined);
    await flush();
    expect(errs[0]).toMatchObject({ code: "INVALID_SYMBOL" });
    expect(rt.calls).toEqual([]);
  });
});

describe("backtest and similar", () => {
  const tenth = (bars: Bar[]) => bars.length === 10;

  it("stock backtest runs a signal or a preset on two years of daily bars", async () => {
    const src = fakeSource(() => trend(200, 100000));
    const r = await client(src).stock("FPT").backtest(tenth, { tp: 0.5, sl: 3, hold: 10 });
    expect(r.trades).toMatchObject([{ symbol: "FPT", outcome: "tp", signalTime: "2026-01-10" }]);
    expect(r.stats.all).toMatchObject({ trades: 1, wins: 1, winRate: 1 });
    expect(src.calls[0]).toMatchObject({ frame: "ONE_DAY" });
    expect((await client(src).stock("FPT").backtest("ema_cross", { tp: 5, sl: 3, hold: 10 })).trades).toEqual([]);
    await expect(
      client(src)
        .stock("FPT")
        .backtest("macd" as any, { tp: 5, sl: 3, hold: 10 })
    ).rejects.toMatchObject({ code: "INVALID_PARAMETER" });
  });

  it("vn.backtest pools the trades of several symbols", async () => {
    const vn = client(fakeSource(() => trend(200, 100000)));
    const r = await vn.backtest(["fpt", "VCB"], tenth, { tp: 0.5, sl: 3, hold: 10 });
    expect(r.trades.map((t) => t.symbol)).toEqual(["FPT", "VCB"]);
    expect(r.stats.all.trades).toBe(2);
    await expect(vn.backtest(["FPT", "FTP"], tenth, { tp: 5, sl: 3, hold: 10 })).rejects.toMatchObject({ code: "INVALID_SYMBOL" });
    await expect(vn.backtest(["FPT"], tenth, { tp: 0, sl: 3, hold: 10 })).rejects.toMatchObject({ code: "INVALID_PARAMETER" });
  });

  it("similar compares the last session with five years of history", async () => {
    const s = await client(fakeSource(() => trend(300, 100000)))
      .stock("FPT")
      .similar({ top: 3 });
    expect(s.matches).toHaveLength(3);
    expect(s.symbol).toBe("FPT");
  });
});
