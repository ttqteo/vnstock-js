import { createHandlers } from "../../../src/cli/mcp/handlers";

const quote = (symbol: string, over: any = {}) => ({
  symbol,
  name: symbol + " Corp",
  nameEn: symbol,
  exchange: "HOSE",
  price: 59300,
  change: 100,
  changePct: 0.169,
  ref: 59200,
  ceiling: 63300,
  floor: 55100,
  high: 59400,
  low: 59100,
  avg: 59250,
  volume: 3830000,
  value: 227e9,
  foreignBuyVolume: 0,
  foreignSellVolume: 0,
  matchVolume: 0,
  bids: [],
  asks: [],
  ...over,
});

function fakeClient() {
  const handle = {
    history: jest.fn(async () => [
      { time: "2026-07-29", close: 59200 },
      { time: "2026-07-30", close: 59300 },
    ]),
    dividends: jest.fn(async () => [{ id: "d1", eventType: "DIVIDEND_CASH" }]),
    events: jest.fn(async () => [{ id: "d1" }, { id: "e2" }]),
    context: jest.fn(async () => ({ symbol: "VCB", trend: { direction: "bullish", strength: 0.62 } })),
    prompt: jest.fn(async () => "=== VCB · 2026-07-30 ==="),
    foreign: jest.fn(async () => ({ symbol: "VCB", date: "2026-07-30", netValue: -12.5e9, unit: "VND" })),
    financials: jest.fn(async (kind: string, o: any) => ({ symbol: "VCB", kind, period: o.period, unit: "VND", rows: [] })),
    patterns: jest.fn(async () => ({
      zones: [{ low: 58000, high: 58500, kind: "support", touches: 3, lastTouch: "2026-07-20" }],
      extreme: null,
      candles: [{ time: "2026-07-30", pattern: "hammer", bias: "bullish" }],
      turtle: { time: "2026-07-28", action: "buy", price: 59300, stop: 57100, reason: "20-session high" },
      breakouts: [],
    })),
    similar: jest.fn(async (o: any) => ({
      symbol: "VCB",
      asOf: "2026-07-30",
      fingerprint: {},
      matches: [{ time: "2025-03-04", similarity: 0.97, close: 61000, ret5: 2.1, ret20: 4.5, ret60: null }].slice(0, o.top),
      summary: { ret5: { count: 1, avg: 2.1, winRate: 1 }, ret20: { count: 1, avg: 4.5, winRate: 1 }, ret60: { count: 0, avg: null, winRate: null } },
    })),
  };
  const market: any = jest.fn();
  market.breadth = jest.fn(async (o: any) => ({
    exchange: o.exchange,
    date: "2026-07-30",
    advancing: 200,
    declining: 150,
    unchanged: 50,
    ceiling: 5,
    floor: 2,
    total: 400,
  }));
  market.foreign = jest.fn(async (o: any) => ({
    exchange: o.exchange,
    date: "2026-07-30",
    netValue: 507.1e9,
    buyValue: 2e12,
    sellValue: 1.4929e12,
    topNetBuy: [],
    topNetSell: [],
    unit: "VND",
  }));
  market.context = jest.fn(async () => ({
    date: "2026-07-30",
    index: { symbol: "VNINDEX", close: 1700, changePercent: 0.5 },
    regime: "trending_up",
    liquidity: { value: 21e12, signal: "normal" },
  }));
  const stats = { trades: 2, wins: 1, winRate: 0.5, avgRet: 1.5, medianRet: 1.5, best: 7, worst: -4, tp: 1, sl: 1, timeout: 0, avgHeld: 4 };
  const portfolio: any = jest.fn(async (input: any) => ({
    date: "2026-07-30",
    positions: input.positions.map((p: any) => ({ ...p, price: 59300, value: p.quantity * 59300, pnl: 0, pnlPct: 0, weight: 1, industry: "Ngân hàng" })),
    byBroker: {},
    byIndustry: {},
    totals: { value: 5930000, cost: 5800000, pnl: 130000, pnlPct: 2.241, cash: 0, nav: 5930000 },
    unit: "VND",
  }));
  portfolio.load = jest.fn(async () => ({ positions: [{ symbol: "VCB", quantity: 100, cost: 58000 }] }));
  portfolio.save = jest.fn(async () => undefined);
  const client: any = {
    portfolio,
    backtest: jest.fn(async () => ({
      trades: [{ symbol: "VCB", signalTime: "2026-07-01", outcome: "tp", ret: 7 }],
      stats: { all: stats, byTag: {} },
    })),
    prices: jest.fn(async (symbols: string[]) => symbols.filter((s) => s !== "XYZ").map((s) => quote(s))),
    stock: jest.fn(() => handle),
    search: jest.fn(async () => [{ symbol: "VNM", companyName: "Vinamilk" }]),
    symbols: jest.fn(async (o: any = {}) =>
      o.exchange === "HNX"
        ? [{ symbol: "SHS", companyName: "SHS", exchange: "HNX" }]
        : [
            { symbol: "VCB", companyName: "Vietcombank", exchange: "HSX" },
            { symbol: "SHS", companyName: "SHS", exchange: "HNX" },
          ]
    ),
    topMovers: jest.fn(async (o: any) => ({ gainers: [{ symbol: "AAA" }].slice(0, o.limit), losers: [{ symbol: "BBB" }].slice(0, o.limit) })),
    calendar: { isTradingDay: jest.fn(async (d: string) => d !== "2026-09-02"), holidays: jest.fn(async () => ["2026-09-02"]) },
    market,
    news: jest.fn(async () => [
      { id: "a", title: "VN-Index tăng" },
      { id: "b", title: "x" },
    ]),
    screen: jest.fn(async () => [{ symbol: "VCB" }]),
    gold: jest.fn(async () => ({ source: "btmc", unit: "VND/luong", items: [{ name: "SJC", buy: 123e6 }] })),
    fx: jest.fn(async () => [
      { currencyCode: "USD", buyCash: 25880 },
      { currencyCode: "EUR", buyCash: 28000 },
    ]),
  };
  const lists: Record<string, string[]> = {};
  const watchlist: any = {
    listAll: jest.fn(async () => Object.keys(lists)),
    list: jest.fn(async (n: string) => lists[n] || []),
    create: jest.fn(async (n: string) => (lists[n] = [])),
    delete: jest.fn(async (n: string) => delete lists[n]),
    add: jest.fn(async (n: string, s: string[]) => (lists[n] = (lists[n] || []).concat(s))),
    remove: jest.fn(async (n: string, s: string) => (lists[n] = (lists[n] || []).filter((x) => x !== s))),
  };
  return { client, handle, market, watchlist, handlers: createHandlers(client, { watchlist }) };
}

const text = (res: any) => res.content.map((c: any) => c.text).join("\n");

describe("MCP handlers: basic data tools", () => {
  it("get_quote requires a symbol, reports unknown ones and prints prices from dong", async () => {
    const { handlers } = fakeClient();
    expect((await handlers.get_quote({})).isError).toBe(true);
    expect((await handlers.get_quote({ symbol: "xyz" })).isError).toBe(true);
    const res = await handlers.get_quote({ symbol: "vcb" });
    expect(res.isError).toBeUndefined();
    expect(text(res)).toContain("Giá: 59.3k");
    expect(text(res)).toContain("Trần/Sàn: 63.3k / 55.1k");
  });

  it("get_quote caches a symbol for a short while", async () => {
    const { handlers, client } = fakeClient();
    await handlers.get_quote({ symbol: "VCB" });
    await handlers.get_quote({ symbol: "VCB" });
    expect(client.prices).toHaveBeenCalledTimes(1);
  });

  it("get_history reads explicit dates or the last three months, and honours the limit", async () => {
    const { handlers, handle } = fakeClient();
    expect((await handlers.get_history({})).isError).toBe(true);
    await handlers.get_history({ symbol: "VCB", from: "2026-07-01", to: "2026-07-30" });
    expect(handle.history).toHaveBeenLastCalledWith({ from: "2026-07-01", to: "2026-07-30" });
    const res = await handlers.get_history({ symbol: "VCB", limit: 1 });
    expect(handle.history).toHaveBeenLastCalledWith("3mo");
    expect(text(res)).toContain("1 phiên");
  });

  it("search_symbols and list_symbols read the client", async () => {
    const { handlers, client } = fakeClient();
    expect((await handlers.search_symbols({})).isError).toBe(true);
    expect(text(await handlers.search_symbols({ query: "vinamilk", limit: 3 }))).toContain("VNM");
    expect(client.search).toHaveBeenCalledWith("vinamilk", { limit: 3 });
    expect(text(await handlers.list_symbols({ exchange: "hnx" }))).toContain("Sàn HNX: 1 mã");
  });

  it("top_movers returns gainers and losers", async () => {
    const { handlers, client } = fakeClient();
    const res = await handlers.top_movers({ limit: 1 });
    expect(client.topMovers).toHaveBeenCalledWith({ limit: 1 });
    expect(text(res)).toContain('"AAA"');
  });

  it("is_trade_day and get_trading_calendar answer from the calendar", async () => {
    const { handlers } = fakeClient();
    expect(text(await handlers.is_trade_day({ date: "2026-09-02" }))).toContain("không có giao dịch");
    expect((await handlers.get_trading_calendar({ year: "abc" })).isError).toBe(true);
    expect(text(await handlers.get_trading_calendar({ year: 2026 }))).toContain("1 ngày nghỉ");
  });

  it("get_company_info finds the symbol or says it cannot", async () => {
    const { handlers } = fakeClient();
    expect((await handlers.get_company_info({ symbol: "XYZ" })).isError).toBe(true);
    expect(text(await handlers.get_company_info({ symbol: "vcb" }))).toContain("VCB: Vietcombank · HSX");
  });

  it("get_dividends and get_corporate_events go through the stock handle", async () => {
    const { handlers, handle } = fakeClient();
    expect((await handlers.get_dividends({})).isError).toBe(true);
    expect(text(await handlers.get_dividends({ symbol: "VCB" }))).toContain("1 sự kiện cổ tức");
    expect(text(await handlers.get_corporate_events({ symbol: "VCB" }))).toContain("2 sự kiện");
    handle.dividends.mockRejectedValueOnce(new Error("down"));
    expect((await handlers.get_dividends({ symbol: "VCB" })).isError).toBe(true);
  });
});

describe("MCP handlers: AI primitives", () => {
  it("get_ai_context passes lookback and as_of and caches per date", async () => {
    const { handlers, handle } = fakeClient();
    expect((await handlers.get_ai_context({})).isError).toBe(true);
    const res = await handlers.get_ai_context({ symbol: "VCB", lookback: 100, as_of: "2026-06-30" });
    expect(handle.context).toHaveBeenCalledWith({ lookback: 100, asOf: "2026-06-30" });
    expect(text(res)).toContain("trend bullish (62%)");
    await handlers.get_ai_context({ symbol: "VCB", lookback: 100, as_of: "2026-06-30" });
    await handlers.get_ai_context({ symbol: "VCB", lookback: 100 });
    expect(handle.context).toHaveBeenCalledTimes(2);
  });

  it("to_ai_prompt returns plain text", async () => {
    const { handlers, handle } = fakeClient();
    const res = await handlers.to_ai_prompt({ symbol: "VCB", lang: "en" });
    expect(handle.prompt).toHaveBeenCalledWith({ lang: "en", asOf: undefined });
    expect(res.content).toHaveLength(1);
  });

  it("compare_symbols needs 2 to 10 symbols", async () => {
    const { handlers } = fakeClient();
    expect((await handlers.compare_symbols({ symbols: ["VCB"] })).isError).toBe(true);
    expect((await handlers.compare_symbols({ symbols: Array.from({ length: 11 }, (_, i) => "S" + i) })).isError).toBe(true);
    expect(text(await handlers.compare_symbols({ symbols: ["vcb", "fpt"] }))).toContain("So sánh 2 mã: VCB, FPT");
  });
});

describe("MCP handlers: market tools", () => {
  it("get_market_breadth reads HSX as HOSE and rejects unknown exchanges", async () => {
    const { handlers, market } = fakeClient();
    expect((await handlers.get_market_breadth({ exchange: "NYSE" })).isError).toBe(true);
    await handlers.get_market_breadth({ exchange: "hsx" });
    expect(market.breadth).toHaveBeenCalledWith({ exchange: "HOSE" });
  });

  it("get_foreign_flow prints money from dong for the market and a symbol", async () => {
    const { handlers } = fakeClient();
    expect(text(await handlers.get_foreign_flow({ top: 3 }))).toContain("mua ròng 507.1 tỷ (mua 2 nghìn tỷ, bán 1.5 nghìn tỷ)");
    expect(text(await handlers.get_foreign_flow({ symbol: "vcb" }))).toContain("bán ròng 12.5 tỷ");
  });

  it("get_market_context passes as_of and prints liquidity from dong", async () => {
    const { handlers, market } = fakeClient();
    const res = await handlers.get_market_context({ as_of: "2026-06-30", index: "VN30" });
    expect(market.context).toHaveBeenCalledWith({ exchange: "HOSE", index: "VN30", asOf: "2026-06-30" });
    expect(text(res)).toContain("thanh khoản 21 nghìn tỷ");
  });
});

describe("MCP handlers: news, financials, screening, commodities", () => {
  it("get_news passes keyword and source through and honours the limit", async () => {
    const { handlers, client } = fakeClient();
    await handlers.get_news({ keyword: "VN-Index", date: "2026-07-30" });
    expect(client.news).toHaveBeenLastCalledWith({ date: "2026-07-30", source: undefined, query: "VN-Index" });
    await handlers.get_news({ source: "Vietstock" });
    expect(client.news).toHaveBeenLastCalledWith({ date: undefined, source: "Vietstock", query: undefined });
    expect(text(await handlers.get_news({ limit: 1 }))).toContain("1 tin");
    client.news.mockResolvedValueOnce([]);
    expect(text(await handlers.get_news({ date: "2026-07-26" }))).toContain("Không có tin");
  });

  it("get_financials maps report names to statement kinds", async () => {
    const { handlers, handle } = fakeClient();
    await handlers.get_financials({ symbol: "VCB" });
    expect(handle.financials).toHaveBeenLastCalledWith("balance", { period: "quarter" });
    await handlers.get_financials({ symbol: "VCB", report: "income_statement", period: "year" });
    expect(handle.financials).toHaveBeenLastCalledWith("income", { period: "year" });
    await handlers.get_financials({ symbol: "VCB", report: "ratios" });
    expect(handle.financials).toHaveBeenLastCalledWith("ratios", { period: "quarter" });
    expect((await handlers.get_financials({ symbol: "VCB", report: "profit" })).isError).toBe(true);
    expect((await handlers.get_financials({})).isError).toBe(true);
  });

  it("screen_stocks needs a universe, takes where and sort, and still reads v1 filters", async () => {
    const { handlers, client } = fakeClient();
    expect((await handlers.screen_stocks({})).isError).toBe(true);
    await handlers.screen_stocks({ group: "vn30", where: { pe: { lt: 15 } }, sort: "-roe" });
    expect(client.screen).toHaveBeenLastCalledWith({ group: "VN30", exchange: undefined, where: { pe: { lt: 15 } }, sort: "-roe", limit: 20 });
    await handlers.screen_stocks({ exchange: "hose", filters: [{ field: "roe", operator: ">", value: 0.2 }], sort_by: "pe", order: "asc", limit: 5 });
    expect(client.screen).toHaveBeenLastCalledWith({ group: undefined, exchange: "HOSE", where: { roe: { gt: 0.2 } }, sort: "pe", limit: 5 });
    expect((await handlers.screen_stocks({ group: "VN30", filters: [{ field: "pe", operator: "!=", value: 1 }] })).isError).toBe(true);
  });

  it("get_gold_price names its source and rejects unknown ones", async () => {
    const { handlers } = fakeClient();
    expect(text(await handlers.get_gold_price({}))).toContain("Giá vàng từ btmc: 1 loại, đơn vị đồng/lượng");
    expect((await handlers.get_gold_price({ source: "sjc" })).isError).toBe(true);
  });

  it("get_exchange_rate filters by currency and errors when it is missing", async () => {
    const { handlers } = fakeClient();
    expect(text(await handlers.get_exchange_rate({ currency: "usd" }))).toContain("1 loại tiền");
    expect((await handlers.get_exchange_rate({ currency: "JPY" })).isError).toBe(true);
  });
});

describe("MCP handlers: watchlist", () => {
  it("lists all without a name and needs a name otherwise", async () => {
    const { handlers } = fakeClient();
    expect((await handlers.watchlist({ action: "list_all" })).isError).toBeUndefined();
    expect((await handlers.watchlist({ action: "list" })).isError).toBe(true);
  });

  it("adds uppercased symbols, removes each one, and quotes the list", async () => {
    const { handlers, watchlist, client } = fakeClient();
    await handlers.watchlist({ action: "add", name: "bank", symbols: ["vcb", "acb"] });
    expect(watchlist.add).toHaveBeenCalledWith("bank", ["VCB", "ACB"]);
    expect(text(await handlers.watchlist({ action: "list_all" }))).toContain("1 danh sách theo dõi: bank");
    expect(text(await handlers.watchlist({ action: "list", name: "bank" }))).toContain("bank: 2 mã: VCB, ACB");
    await handlers.watchlist({ action: "remove", name: "bank", symbols: ["ACB"] });
    expect(watchlist.remove).toHaveBeenCalledTimes(1);
    await handlers.watchlist({ action: "quote", name: "bank" });
    expect(client.prices).toHaveBeenCalledWith(["VCB"]);
  });

  it("does not ask for prices for an empty list and rejects unknown actions", async () => {
    const { handlers, client } = fakeClient();
    await handlers.watchlist({ action: "quote", name: "empty" });
    expect(client.prices).not.toHaveBeenCalled();
    expect((await handlers.watchlist({ action: "rename", name: "x" })).isError).toBe(true);
  });
});

describe("MCP handlers: v2 tools", () => {
  it("find_patterns summarises zones, candles and the Turtle state", async () => {
    const { handlers, handle } = fakeClient();
    expect((await handlers.find_patterns({})).isError).toBe(true);
    const res = await handlers.find_patterns({ symbol: "vcb", recent: 5 });
    expect(handle.patterns).toHaveBeenCalledWith({ recent: 5 });
    expect(text(res)).toContain("hỗ trợ 58k-58.5k");
    expect(text(res)).toContain("hammer");
    expect(text(res)).toContain("Turtle: buy");
  });

  it("get_foreign_history reads a symbol or the market over a range", async () => {
    const { handlers, handle, market } = fakeClient();
    handle.foreign.mockResolvedValueOnce([
      { symbol: "VCB", date: "2026-07-29", netValue: 5e9 },
      { symbol: "VCB", date: "2026-07-30", netValue: -2e9 },
    ] as any);
    const one = await handlers.get_foreign_history({ symbol: "VCB", range: "1mo" });
    expect(handle.foreign).toHaveBeenLastCalledWith("1mo");
    expect(text(one)).toContain("2 phiên");
    expect(text(one)).toContain("3 tỷ");
    market.foreign.mockResolvedValueOnce([] as any);
    const all = await handlers.get_foreign_history({ exchange: "hsx" });
    expect(market.foreign).toHaveBeenLastCalledWith({ range: "1mo", exchange: "HOSE" });
    expect(text(all)).toContain("chưa có phiên nào");
    expect((await handlers.get_foreign_history({ range: "6m" })).isError).toBe(true);
  });

  it("portfolio_summary values the given or the saved holdings and can save them", async () => {
    const { handlers, client } = fakeClient();
    expect(text(await handlers.portfolio_summary({}))).toContain("NAV 5.9 triệu");
    expect(client.portfolio.load).toHaveBeenCalled();
    const positions = [{ symbol: "VCB", quantity: 100, cost: 58000 }];
    await handlers.portfolio_summary({ positions, cash: 1000000, save: true });
    expect(client.portfolio.save).toHaveBeenCalledWith({ positions, cash: 1000000 });
    client.portfolio.load.mockResolvedValueOnce({ positions: [] });
    expect(text(await handlers.portfolio_summary({}))).toContain("portfolio.json");
  });

  it("backtest_signal takes a preset over one or more symbols", async () => {
    const { handlers, client } = fakeClient();
    expect((await handlers.backtest_signal({ symbols: ["VCB"], preset: "macd", tp: 7, sl: 4, hold: 10 })).isError).toBe(true);
    const res = await handlers.backtest_signal({ symbol: "vcb", preset: "breakout", tp: 7, sl: 4, hold: 10, range: "5y" });
    expect(client.backtest).toHaveBeenCalledWith(["VCB"], "breakout", { tp: 7, sl: 4, hold: 10, range: "5y" });
    expect(text(res)).toContain("2 lệnh");
    expect(text(res)).toContain("thắng 50%");
  });

  it("find_similar_setups reports matches and forward returns", async () => {
    const { handlers, handle } = fakeClient();
    const res = await handlers.find_similar_setups({ symbol: "VCB", top: 3 });
    expect(handle.similar).toHaveBeenCalledWith({ top: 3 });
    expect(text(res)).toContain("2025-03-04");
    expect(text(res)).toContain("20 phiên sau: TB +4.5%");
  });
});
