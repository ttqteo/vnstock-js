import { createTransport, Transport } from "../transport";
import { Storage, memoryStorage } from "../storage";
import { createDatasets, Datasets } from "../data/datasets";
import { VciAdapter } from "../adapters/vci";
import { StockDataAdapter } from "../adapters/types";
import { InvalidParameterError, InvalidSymbolError, ParseError } from "../errors";
import { Quote, Range } from "../types";
import { SymbolInfo } from "../models/normalized";
import { ictToday } from "../shared/time";
import { closest } from "../shared/suggest";
import { checkPortfolio, valuePortfolio, PortfolioInput, PortfolioSummary } from "../compute/portfolio";
import { search as searchSymbols, getByExchange, getByIndustry } from "../core/listing/directory";
import { isTradeDay, nextTradeDay, prevTradeDay, holidays } from "../core/market/calendar";
import { StockHandle, IndexHandle } from "./stock";
import { checkBacktest, runBacktest, summarize, BacktestOptions, BacktestResult, Signal } from "../compute/backtest";
import { resolveSignal, PresetName } from "../compute/signals";
import {
  overview,
  marketContext,
  breadth,
  liquidity,
  foreignFlow,
  intraday,
  marketSeries,
  normalizeExchange,
  ExchangeOption,
  MarketOverview,
  MarketContext,
  MarketForeignFlow,
  MarketForeignDay,
} from "./market";
import { createForeignHistory, daysFor, ForeignHistory } from "../data/foreign";
import { RealtimeClient } from "../realtime";
import { createWatchHub, watchWhenReady, RealtimeLike, TickListener, WatchHub, WatchOptions } from "./watch";
import { screen, statisticsFetcher, isPrebuiltField, ScreenOptions, ScreenRow } from "./screen";
import { gold, fx, GoldSource } from "./commodity";
import { news, NewsOptions } from "./news";
import { topMovers } from "./movers";

export interface ClientOptions {
  /** Base path of a vnstock-js proxy. Required in browsers; see vnstock-js/proxy. */
  proxy?: string;
  /** Per-request timeout in ms. Default 15000. */
  timeout?: number;
  /** Extra attempts after a failed request. Default 2. */
  retries?: number;
  /** In-memory cache of slow-changing upstream data. Default true. */
  cache?: boolean;
  /** Where datasets (symbols, holidays, ratios) are cached. Default in memory. */
  storage?: Storage;
  fetch?: typeof fetch;
  /** Start loading symbols and holidays immediately. */
  preload?: boolean;
  /** @internal */ now?: () => number;
  /** @internal */ _source?: ClientSource;
  /** @internal */ _datasets?: Datasets;
  /** @internal */ _realtime?: () => RealtimeLike;
}

/** What the client needs from a data source; VciAdapter provides all of it. */
export type ClientSource = Required<Pick<StockDataAdapter, "fetchBars" | "fetchQuotes">> &
  Pick<StockDataAdapter, "fetchSymbolsByGroup" | "fetchSymbolsByIndustries" | "fetchCompanyOverview" | "fetchFinancialReport"> & {
    /** Per-symbol statistics for screening; built on the transport when absent. */
    fetchStatistics?: (symbol: string) => Promise<any | null>;
  };

export interface ClientContext {
  transport: Transport;
  storage: Storage;
  datasets: Datasets;
  source: ClientSource;
  now: () => number;
  foreign: ForeignHistory;
  watch: WatchHub;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PORTFOLIO_KEY = "portfolio";

function checkDate(date: string): string {
  if (!DATE_RE.test(date)) throw new InvalidParameterError("date", date, undefined, "Dates are YYYY-MM-DD.");
  return date;
}

/** The symbol list says HSX like VCI; everything the client returns says HOSE. */
function withHose(list: SymbolInfo[]): SymbolInfo[] {
  return list.map((s) => (s.exchange === "HSX" ? { ...s, exchange: "HOSE" } : s));
}

function normalizeUniverse(name: string): string {
  return name.toUpperCase() === "HSX" ? "HOSE" : name;
}

/**
 * Creates a client. Nothing touches the network until a method needs data.
 * @example
 * const vn = createClient({ proxy: '/api/vnstock' })
 * await vn.stock('FPT').price()
 */
export function createClient(options: ClientOptions = {}) {
  const transport = createTransport({ proxy: options.proxy, timeout: options.timeout, retries: options.retries, fetch: options.fetch });
  const storage = options.storage || memoryStorage();
  const source: ClientSource = options._source || (new VciAdapter({ cache: options.cache, transport }) as ClientSource);
  const now = options.now || Date.now;
  const ctx: ClientContext = {
    transport,
    storage,
    datasets: options._datasets || createDatasets({ transport, storage }),
    source,
    now,
    foreign: createForeignHistory({ transport, storage, now }),
    watch: createWatchHub({
      now,
      fetchQuotes: (symbols) => source.fetchQuotes(symbols),
      realtime: options._realtime || (() => new RealtimeClient()),
    }),
  };
  const fetchStatistics = source.fetchStatistics ? source.fetchStatistics.bind(source) : statisticsFetcher(transport);
  if (options.preload) {
    ctx.datasets.symbols().catch(() => undefined);
    ctx.datasets.holidays().catch(() => undefined);
  }

  /**
   * Market overview (index, liquidity, breadth, foreign flow) for the current session, or with
   * asOf the market context of that day. Money in dong.
   * @example
   * await vn.market({ exchange: 'HOSE' })
   * await vn.market({ asOf: '2026-10-10' })
   */
  function market(opts?: ExchangeOption & { index?: string }): Promise<MarketOverview>;
  function market(opts: ExchangeOption & { index?: string; asOf: string }): Promise<MarketContext>;
  function market(opts: ExchangeOption & { index?: string; asOf?: string } = {}): Promise<MarketOverview | MarketContext> {
    const o = { ...opts, now: ctx.now() };
    return opts.asOf ? marketContext(source, o) : overview(source, o);
  }

  /**
   * Board-wide foreign buy/sell in dong. Without a range, the current session with top net buyers
   * and sellers; with a range, one row per recorded session, oldest first (recording began in 2026,
   * earlier sessions are absent).
   * @example
   * await vn.market.foreign({ top: 5 })
   * await vn.market.foreign({ range: '1mo', exchange: 'ALL' })
   */
  function marketForeign(opts?: ExchangeOption & { top?: number }): Promise<MarketForeignFlow>;
  function marketForeign(opts: ExchangeOption & { range: Range | { from: string; to?: string } }): Promise<MarketForeignDay[]>;
  async function marketForeign(
    opts: ExchangeOption & { top?: number; range?: Range | { from: string; to?: string } } = {}
  ): Promise<MarketForeignFlow | MarketForeignDay[]> {
    if (opts.range === undefined) return foreignFlow(source, { ...opts, now: ctx.now() });
    const exchange = normalizeExchange(opts.exchange);
    return marketSeries(await daysFor(ctx.foreign, opts.range, ctx.now()), exchange);
  }

  const marketApi = Object.assign(market, {
    /**
     * Advance/decline counts of the current session.
     * @example
     * await vn.market.breadth({ exchange: 'HNX' })
     */
    breadth: (opts: ExchangeOption = {}) => breadth(source, { ...opts, now: ctx.now() }),
    /**
     * Session turnover of an index, in dong.
     * @example
     * await vn.market.liquidity({ index: 'VN30' })
     */
    liquidity: (opts: { index?: string; asOf?: string } = {}) => liquidity(source, { ...opts, now: ctx.now() }),
    /**
     * Session turnover by minute against the previous session at the same clock time, with board
     * breadth now. Money in dong, the index in points. For dashboards during the session.
     * @example
     * const d = await vn.market.intraday({ index: 'VNINDEX' })
     * d.liquidity.changePercent
     */
    intraday: (opts: ExchangeOption & { index?: string } = {}) => intraday(source, { ...opts, now: ctx.now() }),
    foreign: marketForeign,
    /**
     * Market regime, liquidity against its norm, breadth and foreign flow, for an LLM. With asOf,
     * breadth and foreign flow are null and `notes` says why.
     * @example
     * await vn.market.context({ index: 'VN30' })
     */
    context: (opts: ExchangeOption & { index?: string; asOf?: string } = {}) => marketContext(source, { ...opts, now: ctx.now() }),
  });

  /** Throws InvalidSymbolError with a suggestion for the first symbol not in the symbol list. */
  async function checkSymbols(symbols: string[]): Promise<void> {
    const all = (await ctx.datasets.symbols()).map((s) => s.symbol);
    for (const s of symbols) if (!all.includes(s)) throw new InvalidSymbolError(s, closest(s, all) || undefined);
  }

  /**
   * Values holdings at live prices: per position, per broker, per industry and in total. Money in
   * dong, `cost` per share in dong, pnlPct in percent, weight as a fraction of NAV.
   * @example
   * const p = await vn.portfolio({ positions: [{ symbol: 'FPT', quantity: 100, cost: 120000 }], cash: 5000000 })
   * p.totals.nav
   */
  async function portfolio(input: PortfolioInput): Promise<PortfolioSummary> {
    checkPortfolio(input);
    const symbols = Array.from(new Set(input.positions.map((p) => p.symbol.toUpperCase())));
    await checkSymbols(symbols);
    const quotes = symbols.length === 0 ? [] : await source.fetchQuotes(symbols);
    return valuePortfolio(input, quotes, await ctx.datasets.symbols(), ictToday(ctx.now()));
  }

  const portfolioApi = Object.assign(portfolio, {
    /**
     * Holdings kept in the client storage under "portfolio" (~/.vnstock-js/portfolio.json with
     * fileStorage), or no positions when nothing is stored.
     * @example
     * await vn.portfolio(await vn.portfolio.load())
     */
    async load(): Promise<PortfolioInput> {
      const raw = await storage.get(PORTFOLIO_KEY);
      if (!raw) return { positions: [] };
      try {
        const v = JSON.parse(raw);
        checkPortfolio(v);
        return { positions: v.positions, cash: v.cash };
      } catch (err) {
        throw new ParseError("Stored portfolio is not valid: " + (err instanceof Error ? err.message : String(err)), err instanceof Error ? err : undefined);
      }
    },
    /**
     * Checks holdings, then keeps them in the client storage.
     * @example
     * await vn.portfolio.save({ positions: [{ symbol: 'FPT', quantity: 100, cost: 120000, broker: 'DNSE' }], cash: { DNSE: 5000000 } })
     */
    async save(input: PortfolioInput): Promise<void> {
      checkPortfolio(input);
      await storage.set(PORTFOLIO_KEY, JSON.stringify({ positions: input.positions, cash: input.cash }, null, 2));
    },
  });

  return {
    /**
     * Handle for one listed stock. Creating it is free; the symbol is checked on first call.
     * @example
     * const fpt = vn.stock('FPT')
     * await fpt.price()
     * await fpt.history('6mo')
     */
    stock: (symbol: string) => new StockHandle(ctx, symbol),

    /**
     * Handle for an index (VNINDEX, VN30, VN100, HNXIndex, HNX30, HNXUpcomIndex). Levels in points.
     * @example
     * await vn.index('VNINDEX').history('1y')
     */
    index: (symbol: string) => new IndexHandle(ctx, symbol),

    /**
     * Live quotes for many symbols in one request, money in dong.
     * @example
     * await vn.prices(['FPT', 'VCB'])
     * await vn.prices({ group: 'VN30' })
     */
    async prices(input: string[] | { group?: string; exchange?: string }): Promise<Quote[]> {
      const symbols = Array.isArray(input)
        ? input.map((s) => s.toUpperCase())
        : (await source.fetchSymbolsByGroup(normalizeUniverse(input.group || input.exchange || "VN30"))).map((s) => s.symbol);
      if (symbols.length === 0) return [];
      return source.fetchQuotes(symbols);
    },

    /**
     * Live ticks for several stocks, money in dong, over the client's one realtime connection.
     * Returns a function that stops watching. Symbols are checked first; an unknown one goes to
     * onError and nothing is watched. Pass { mode: 'poll' } where a WebSocket cannot stay open.
     * @example
     * const stop = vn.watch(['FPT', 'VCB'], (t) => console.log(t.symbol, t.price, t.changePct))
     * stop()
     */
    watch(symbols: string[], cb: TickListener, options: WatchOptions = {}): () => void {
      const list = Array.isArray(symbols) ? symbols.map((s) => s.toUpperCase()) : symbols;
      return watchWhenReady(ctx.watch, checkSymbols(list), list, cb, options);
    },

    /**
     * backtest() over several stocks: the trades of every symbol, oldest signal first, with stats
     * over all of them and per tag. tp, sl and ret are percent.
     * @example
     * const r = await vn.backtest(['FPT', 'VCB', 'HPG'], 'oversold_bounce', { tp: 5, sl: 3, hold: 10, range: '2y' })
     * r.stats.all.avgRet
     */
    async backtest(
      symbols: string[],
      signal: Signal | PresetName,
      options: BacktestOptions & { range?: Range | { from: string; to?: string } }
    ): Promise<BacktestResult> {
      const fn = resolveSignal(signal);
      checkBacktest(options);
      if (!Array.isArray(symbols) || symbols.length === 0)
        throw new InvalidParameterError("symbols", symbols, undefined, "Pass at least one symbol, e.g. ['FPT'].");
      const list = Array.from(new Set(symbols.map((s) => s.toUpperCase())));
      await checkSymbols(list);
      const series = await Promise.all(list.map((s) => new StockHandle(ctx, s).history(options.range ?? "2y")));
      const trades = series.flatMap((bars, k) => runBacktest(list[k], bars, fn, options));
      trades.sort((a, b) => (a.signalTime === b.signalTime ? (a.symbol < b.symbol ? -1 : 1) : a.signalTime < b.signalTime ? -1 : 1));
      return { trades, stats: summarize(trades) };
    },

    market: marketApi,
    portfolio: portfolioApi,

    /**
     * Screens a group or exchange with where filters; values in dong, ratios as fractions.
     * @example
     * await vn.screen({ group: 'VN30', where: { pe: { lt: 15 }, roe: { gt: 0.15 } }, sort: '-roe', limit: 10 })
     */
    async screen(opts: ScreenOptions): Promise<ScreenRow[]> {
      const fields = Object.keys((opts && opts.where) || {});
      if (opts && opts.sort) fields.push(opts.sort.replace(/^-/, ""));
      const ratios = fields.some(isPrebuiltField) ? await ctx.datasets.ratios() : null;
      // Wrapped, not spread: VciAdapter keeps its methods on the prototype.
      const screenSource = {
        fetchSymbolsByGroup: (group: string) => source.fetchSymbolsByGroup(group),
        fetchQuotes: (symbols: string[]) => source.fetchQuotes(symbols),
        fetchSymbolsByIndustries: () => source.fetchSymbolsByIndustries(),
        fetchStatistics,
      };
      return screen(screenSource, opts, ratios);
    },

    /**
     * Ranked symbol search over code, company name and industry.
     * @example
     * await vn.search('ngân hàng', { limit: 5 })
     */
    async search(query: string, opts: { limit?: number } = {}): Promise<SymbolInfo[]> {
      return withHose(searchSymbols(await ctx.datasets.symbols(), query, opts));
    },

    /**
     * Listed symbols, optionally narrowed by exchange (HSX is HOSE), group and industry.
     * @example
     * await vn.symbols({ exchange: 'HOSE' })
     * await vn.symbols({ group: 'VN30' })
     */
    async symbols(opts: { exchange?: string; group?: string; industry?: string } = {}): Promise<SymbolInfo[]> {
      let list = await ctx.datasets.symbols();
      if (opts.exchange) list = getByExchange(list, normalizeUniverse(opts.exchange));
      if (opts.industry) list = getByIndustry(list, opts.industry);
      if (opts.group) {
        const members = new Set((await source.fetchSymbolsByGroup(opts.group)).map((s) => s.symbol));
        list = list.filter((s) => members.has(s.symbol));
      }
      return withHose(list);
    },

    calendar: {
      /**
       * Whether HOSE trades on a date (weekends and holidays do not).
       * @example
       * await vn.calendar.isTradingDay('2026-10-14') // true
       */
      async isTradingDay(date: string): Promise<boolean> {
        return isTradeDay(await ctx.datasets.holidays(), checkDate(date));
      },
      /**
       * The next trading day after a date, today by default.
       * @example
       * await vn.calendar.next('2026-09-01') // "2026-09-03"
       */
      async next(date?: string): Promise<string> {
        return nextTradeDay(await ctx.datasets.holidays(), checkDate(date || ictToday(ctx.now())));
      },
      /**
       * The previous trading day before a date, today by default.
       * @example
       * await vn.calendar.previous()
       */
      async previous(date?: string): Promise<string> {
        return prevTradeDay(await ctx.datasets.holidays(), checkDate(date || ictToday(ctx.now())));
      },
      /**
       * Exchange holidays of one year.
       * @example
       * await vn.calendar.holidays(2026)
       */
      async holidays(year: number): Promise<string[]> {
        return holidays(await ctx.datasets.holidays(), year);
      },
    },

    /**
     * Today's top gainers and losers, prices in dong.
     * @example
     * const { gainers, losers } = await vn.topMovers({ limit: 5 })
     */
    topMovers: (opts: { limit?: number } = {}) => topMovers(transport, opts),

    /**
     * Domestic gold prices in dong per luong (BTMC, falling back to GiaVang.net).
     * @example
     * (await vn.gold()).items[0].sell
     */
    gold: (opts: { source?: GoldSource | "auto" } = {}) => gold(transport, opts),

    /**
     * Vietcombank exchange rates in dong.
     * @example
     * await vn.fx({ date: '2026-10-14' })
     */
    fx: (opts: { date?: string } = {}) => fx(transport, { ...opts, now: ctx.now() }),

    /**
     * One day of Vietnamese financial news, newest first.
     * @example
     * await vn.news({ date: '2026-10-14', query: 'ngân hàng' })
     */
    news: (opts: Omit<NewsOptions, "now"> = {}) => news(transport, { ...opts, now: ctx.now() }),
  };
}

export type Client = ReturnType<typeof createClient>;
export type { StockHandle, IndexHandle } from "./stock";
