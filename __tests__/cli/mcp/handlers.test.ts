jest.mock("../../../src/runtime", () => {
  const mockAdapter = {
    fetchQuoteHistory: jest.fn(),
  };
  const stockMock = {
    trading: {
      priceBoard: jest.fn(),
      topGainers: jest.fn(),
      topLosers: jest.fn(),
    },
    quote: {
      history: jest.fn(),
    },
    aiContext: jest.fn(),
    toAIPrompt: jest.fn(),
    company: jest.fn(),
    foreignFlow: jest.fn(),
    financials: {
      balanceSheet: jest.fn(),
      incomeStatement: jest.fn(),
      cashFlow: jest.fn(),
    },
    screening: {
      screen: jest.fn(),
    },
    adapter: mockAdapter,
  };
  const newsMock = {
    byDate: jest.fn(),
    bySource: jest.fn(),
    search: jest.fn(),
  };
  const commodityMock = {
    goldPrice: jest.fn(),
    exchangeRates: jest.fn(),
  };
  const marketMock = {
    breadth: jest.fn(),
    foreignFlow: jest.fn(),
    aiContext: jest.fn(),
  };
  return {
    Vnstock: jest.fn().mockImplementation(() => ({
      stock: stockMock,
      news: newsMock,
      commodity: commodityMock,
      market: marketMock,
      __mock: stockMock,
      __news: newsMock,
      __commodity: commodityMock,
      __market: marketMock,
    })),
  };
});

// Real Watchlist would touch ~/.vnstock-js on disk.
jest.mock("../../../src/watchlist", () => {
  const watchlistMock = {
    listAll: jest.fn(),
    list: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    add: jest.fn(),
    remove: jest.fn(),
  };
  return {
    Watchlist: jest.fn().mockImplementation(() => watchlistMock),
    __watchlist: watchlistMock,
  };
});

jest.mock("../../../src/data", () => ({
  init: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../../../src/core/listing/directory", () => ({
  Directory: {
    getBySymbol: jest.fn(),
    getByExchange: jest.fn(),
    search: jest.fn(),
  },
}));

jest.mock("../../../src/core/market", () => ({
  calendar: {
    isTradeDay: jest.fn(),
    holidays: jest.fn(),
  },
}));

import { handlers } from "../../../src/cli/mcp/handlers";
import { Vnstock } from "../../../src/runtime";
import { Directory } from "../../../src/core/listing/directory";
import { calendar } from "../../../src/core/market";

const instance = new (Vnstock as any)() as any;
const stockMock = instance.__mock;
const newsMock = instance.__news;
const commodityMock = instance.__commodity;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const watchlistMock = require("../../../src/watchlist").__watchlist;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("MCP handlers: group A (basic data tools)", () => {
  describe("get_quote", () => {
    it("returns error if symbol missing", async () => {
      const res = await handlers.get_quote({});
      expect(res.isError).toBe(true);
    });

    it("returns error if symbol not found", async () => {
      stockMock.trading.priceBoard.mockResolvedValueOnce([]);
      const res = await handlers.get_quote({ symbol: "XYZ" });
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain("Không tìm thấy");
    });

    it("returns content with text + JSON for valid symbol", async () => {
      stockMock.trading.priceBoard.mockResolvedValueOnce([
        { symbol: "VCB", companyName: "Vietcombank", price: 59.3, percentPriceChange: 0.0017, totalVolume: 5_000_000, ceilingPrice: 63, floorPrice: 55, referencePrice: 59 },
      ]);
      const res = await handlers.get_quote({ symbol: "VCB" });
      expect(res.isError).toBeUndefined();
      expect(res.content.length).toBe(2);
      expect(res.content[0].text).toContain("VCB");
    });
  });

  describe("get_history", () => {
    it("returns error if symbol missing", async () => {
      const res = await handlers.get_history({});
      expect(res.isError).toBe(true);
    });

    it("calls quote.history with computed dates", async () => {
      stockMock.quote.history.mockResolvedValueOnce([
        { date: "2026-05-01", open: 1, high: 1, low: 1, close: 1, volume: 1 },
        { date: "2026-05-02", open: 1, high: 1, low: 1, close: 1, volume: 1 },
      ]);
      const res = await handlers.get_history({ symbol: "VCB", limit: 5 });
      expect(res.isError).toBeUndefined();
      expect(stockMock.quote.history).toHaveBeenCalled();
    });
  });

  describe("search_symbols", () => {
    it("returns error if query missing", async () => {
      const res = await handlers.search_symbols({});
      expect(res.isError).toBe(true);
    });

    it("returns results", async () => {
      (Directory.search as jest.Mock).mockReturnValue([{ symbol: "VCB", companyName: "X" }]);
      const res = await handlers.search_symbols({ query: "vietcom" });
      expect(res.isError).toBeUndefined();
      expect(Directory.search).toHaveBeenCalledWith("vietcom", { limit: 10 });
    });
  });

  describe("list_symbols", () => {
    it("filters by exchange when provided", async () => {
      (Directory.getByExchange as jest.Mock).mockReturnValue([{ symbol: "VCB" }]);
      const res = await handlers.list_symbols({ exchange: "hose" });
      expect(res.isError).toBeUndefined();
      expect(Directory.getByExchange).toHaveBeenCalledWith("HOSE");
    });
  });

  describe("top_movers", () => {
    it("returns gainers + losers", async () => {
      stockMock.trading.topGainers.mockResolvedValueOnce([{ symbol: "AAA" }]);
      stockMock.trading.topLosers.mockResolvedValueOnce([{ symbol: "BBB" }]);
      const res = await handlers.top_movers({});
      expect(res.isError).toBeUndefined();
      const data = JSON.parse(res.content[1].text);
      expect(data.gainers.length).toBe(1);
      expect(data.losers.length).toBe(1);
    });
  });

  describe("is_trade_day", () => {
    it("returns boolean from calendar", async () => {
      (calendar.isTradeDay as jest.Mock).mockReturnValue(true);
      const res = await handlers.is_trade_day({ date: "2026-05-14" });
      expect(res.isError).toBeUndefined();
      expect(res.content[0].text).toContain("có giao dịch");
    });
  });

  describe("get_trading_calendar", () => {
    it("returns error if year invalid", async () => {
      const res = await handlers.get_trading_calendar({});
      expect(res.isError).toBe(true);
    });

    it("returns holidays for year", async () => {
      (calendar.holidays as jest.Mock).mockReturnValue(["2026-01-01"]);
      const res = await handlers.get_trading_calendar({ year: 2026 });
      expect(res.isError).toBeUndefined();
      const data = JSON.parse(res.content[1].text);
      expect(data.year).toBe(2026);
    });
  });

  describe("get_company_info", () => {
    it("returns error if symbol not found", async () => {
      (Directory.getBySymbol as jest.Mock).mockReturnValue(null);
      const res = await handlers.get_company_info({ symbol: "XYZ" });
      expect(res.isError).toBe(true);
    });

    it("returns company info", async () => {
      (Directory.getBySymbol as jest.Mock).mockReturnValue({
        symbol: "VCB",
        companyName: "Vietcombank",
        exchange: "HSX",
      });
      const res = await handlers.get_company_info({ symbol: "VCB" });
      expect(res.isError).toBeUndefined();
    });
  });

  describe("get_dividends", () => {
    it("returns error if symbol missing", async () => {
      const res = await handlers.get_dividends({});
      expect(res.isError).toBe(true);
    });

    it("returns dividend events via company().dividends()", async () => {
      const dividendsFn = jest.fn().mockResolvedValueOnce([
        { eventType: "DIVIDEND_CASH", ratio: 0.1, exRightDate: "2026-06-20", recordDate: "2026-06-23" },
      ]);
      stockMock.company.mockReturnValueOnce({ dividends: dividendsFn });
      const res = await handlers.get_dividends({ symbol: "acb" });
      expect(res.isError).toBeUndefined();
      expect(stockMock.company).toHaveBeenCalledWith("ACB");
      expect(dividendsFn).toHaveBeenCalled();
      expect(res.content[0].text).toContain("ACB");
      const data = JSON.parse(res.content[1].text);
      expect(data.length).toBe(1);
    });

    it("returns error response when company call throws", async () => {
      stockMock.company.mockReturnValueOnce({
        dividends: jest.fn().mockRejectedValueOnce(new Error("boom")),
      });
      const res = await handlers.get_dividends({ symbol: "ACB" });
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain("boom");
    });
  });

  describe("get_corporate_events", () => {
    it("returns error if symbol missing", async () => {
      const res = await handlers.get_corporate_events({});
      expect(res.isError).toBe(true);
    });

    it("returns all events via company().events()", async () => {
      const eventsFn = jest.fn().mockResolvedValueOnce([
        { eventType: "AGM", title: "ĐHCĐ 2026" },
        { eventType: "DIVIDEND_STOCK", ratio: 0.15 },
      ]);
      stockMock.company.mockReturnValueOnce({ events: eventsFn });
      const res = await handlers.get_corporate_events({ symbol: "vcb" });
      expect(res.isError).toBeUndefined();
      expect(stockMock.company).toHaveBeenCalledWith("VCB");
      const data = JSON.parse(res.content[1].text);
      expect(data.length).toBe(2);
    });
  });
});

describe("MCP handlers: group B (AI primitives)", () => {
  describe("get_ai_context", () => {
    it("returns error if symbol missing", async () => {
      const res = await handlers.get_ai_context({});
      expect(res.isError).toBe(true);
    });

    it("returns context with trend summary", async () => {
      stockMock.aiContext.mockResolvedValueOnce({
        symbol: "VCB",
        asOf: "2026-05-14",
        trend: { direction: "bullish", strength: 0.7, rationale: "x" },
        indicators: {},
        levels: { support: [], resistance: [] },
        volume: { today: 0, avg20: 0, signal: "normal", zscore: 0 },
        performance: {},
      });
      const res = await handlers.get_ai_context({ symbol: "VCB" });
      expect(res.isError).toBeUndefined();
      expect(res.content[0].text).toContain("bullish");
    });
  });

  describe("to_ai_prompt", () => {
    it("returns plain-text via toAIPrompt", async () => {
      stockMock.toAIPrompt.mockResolvedValueOnce("=== VCB ===\nTrend: bullish");
      const res = await handlers.to_ai_prompt({ symbol: "VCB" });
      expect(res.isError).toBeUndefined();
      expect(res.content[0].text).toContain("Trend");
    });
  });

  describe("compare_symbols", () => {
    it("returns error if < 2 symbols", async () => {
      const res = await handlers.compare_symbols({ symbols: ["VCB"] });
      expect(res.isError).toBe(true);
    });

    it("returns error if > 10 symbols", async () => {
      const res = await handlers.compare_symbols({
        symbols: Array.from({ length: 11 }, (_, i) => "S" + i),
      });
      expect(res.isError).toBe(true);
    });

    it("returns priceBoard data for 2-10 symbols", async () => {
      stockMock.trading.priceBoard.mockResolvedValueOnce([
        { symbol: "VCB", price: 59 },
        { symbol: "TCB", price: 28 },
      ]);
      const res = await handlers.compare_symbols({ symbols: ["vcb", "tcb"] });
      expect(res.isError).toBeUndefined();
      expect(stockMock.trading.priceBoard).toHaveBeenCalledWith(["VCB", "TCB"]);
    });
  });
});

describe("MCP handlers: group C (modules exposed in v1.5.0)", () => {
  describe("get_news", () => {
    it("uses search when a keyword is given", async () => {
      newsMock.search.mockResolvedValueOnce([{ title: "VN-Index tăng" }]);
      const res = await handlers.get_news({ keyword: "VN-Index", date: "2026-07-30" });
      expect(newsMock.search).toHaveBeenCalledWith("VN-Index", "2026-07-30");
      expect(res.isError).toBeUndefined();
    });

    it("uses bySource when only a source is given", async () => {
      newsMock.bySource.mockResolvedValueOnce([{ title: "x" }]);
      await handlers.get_news({ source: "Vietstock" });
      expect(newsMock.bySource).toHaveBeenCalledWith("Vietstock", undefined);
    });

    it("falls back to byDate with no filter", async () => {
      newsMock.byDate.mockResolvedValueOnce([{ title: "x" }]);
      await handlers.get_news({});
      expect(newsMock.byDate).toHaveBeenCalled();
    });

    it("honours the limit", async () => {
      newsMock.byDate.mockResolvedValueOnce([{ a: 1 }, { a: 2 }, { a: 3 }]);
      const res = await handlers.get_news({ limit: 2 });
      expect(res.content[0].text).toContain("2 tin");
    });

    it("says so plainly when there is no news", async () => {
      newsMock.byDate.mockResolvedValueOnce([]);
      const res = await handlers.get_news({ date: "1990-01-01" });
      expect(res.isError).toBeUndefined();
      expect(res.content[0].text).toContain("Không có tin");
    });
  });

  describe("get_financials", () => {
    it("defaults to the balance sheet by quarter", async () => {
      stockMock.financials.balanceSheet.mockResolvedValueOnce({ data: {} });
      await handlers.get_financials({ symbol: "vcb" });
      expect(stockMock.financials.balanceSheet).toHaveBeenCalledWith({
        symbol: "VCB",
        period: "quarter",
      });
    });

    it("routes to the requested report and period", async () => {
      stockMock.financials.cashFlow.mockResolvedValueOnce({ data: {} });
      await handlers.get_financials({ symbol: "FPT", report: "cash_flow", period: "year" });
      expect(stockMock.financials.cashFlow).toHaveBeenCalledWith({
        symbol: "FPT",
        period: "year",
      });
    });

    it("rejects an unknown report instead of guessing", async () => {
      const res = await handlers.get_financials({ symbol: "VCB", report: "profit" });
      expect(res.isError).toBe(true);
    });

    it("requires a symbol", async () => {
      const res = await handlers.get_financials({});
      expect(res.isError).toBe(true);
    });
  });

  describe("get_gold_price", () => {
    it("returns data and names the source it came from", async () => {
      commodityMock.goldPrice.mockResolvedValueOnce({
        source: "giavangnet",
        data: [{ code: "VNGSJC" }],
      });
      const res = await handlers.get_gold_price({});
      expect(res.content[0].text).toContain("giavangnet");
    });

    it("rejects an unknown source", async () => {
      const res = await handlers.get_gold_price({ source: "pnj" });
      expect(res.isError).toBe(true);
    });
  });

  describe("get_exchange_rate", () => {
    it("filters by currency code", async () => {
      commodityMock.exchangeRates.mockResolvedValueOnce([
        { currencyCode: "USD" },
        { currencyCode: "EUR" },
      ]);
      const res = await handlers.get_exchange_rate({ currency: "usd" });
      expect(res.isError).toBeUndefined();
      expect(res.content[0].text).toContain("1 loại tiền");
    });

    it("errors when the currency is not listed", async () => {
      commodityMock.exchangeRates.mockResolvedValueOnce([{ currencyCode: "USD" }]);
      const res = await handlers.get_exchange_rate({ currency: "XYZ" });
      expect(res.isError).toBe(true);
    });
  });

  describe("watchlist", () => {
    it("lists all watchlists without needing a name", async () => {
      watchlistMock.listAll.mockResolvedValueOnce(["dai-han"]);
      const res = await handlers.watchlist({ action: "list_all" });
      expect(res.isError).toBeUndefined();
    });

    it("requires a name for every other action", async () => {
      const res = await handlers.watchlist({ action: "list" });
      expect(res.isError).toBe(true);
    });

    it("uppercases symbols on add", async () => {
      watchlistMock.add.mockResolvedValueOnce(undefined);
      watchlistMock.list.mockResolvedValueOnce(["VCB"]);
      await handlers.watchlist({ action: "add", name: "x", symbols: ["vcb"] });
      expect(watchlistMock.add).toHaveBeenCalledWith("x", ["VCB"]);
    });

    it("removes each symbol given", async () => {
      watchlistMock.remove.mockResolvedValue(undefined);
      watchlistMock.list.mockResolvedValueOnce([]);
      await handlers.watchlist({ action: "remove", name: "x", symbols: ["vcb", "fpt"] });
      expect(watchlistMock.remove).toHaveBeenCalledTimes(2);
    });

    it("quotes every symbol in the list", async () => {
      watchlistMock.list.mockResolvedValueOnce(["VCB", "FPT"]);
      stockMock.trading.priceBoard.mockResolvedValueOnce([{ symbol: "VCB" }, { symbol: "FPT" }]);
      await handlers.watchlist({ action: "quote", name: "x" });
      expect(stockMock.trading.priceBoard).toHaveBeenCalledWith(["VCB", "FPT"]);
    });

    it("does not call priceBoard for an empty list", async () => {
      watchlistMock.list.mockResolvedValueOnce([]);
      const res = await handlers.watchlist({ action: "quote", name: "x" });
      expect(res.isError).toBeUndefined();
      expect(stockMock.trading.priceBoard).not.toHaveBeenCalled();
    });

    it("rejects an unknown action", async () => {
      const res = await handlers.watchlist({ action: "destroy", name: "x" });
      expect(res.isError).toBe(true);
    });
  });
});
