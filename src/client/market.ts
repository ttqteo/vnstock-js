import { Bar, Quote } from "../types";
import { BarsParams } from "../adapters/types";
import { InvalidParameterError } from "../errors";
import { ictToday, isIndexSymbol } from "../shared/time";
import { computeBreadth, classifyRegime, liquiditySignal } from "../core/market/aggregate";
import { Exchange, MarketBreadth, MarketRegime, IndexSnapshot } from "../models/market";
import type { ForeignDay } from "../data/foreign";

export type { Exchange, MarketBreadth, MarketRegime, IndexSnapshot } from "../models/market";

/** Every money field of the market module is in dong. */
export type VndUnit = "VND";

export interface ForeignFlow {
  symbol: string;
  date: string;
  buyVolume: number;
  sellVolume: number;
  netVolume: number;
  /** Volume x average price, in dong. */
  buyValue: number;
  sellValue: number;
  netValue: number;
  unit: VndUnit;
}

export interface MarketForeignFlow {
  exchange: Exchange | "ALL";
  date: string;
  buyVolume: number;
  sellVolume: number;
  netVolume: number;
  buyValue: number;
  sellValue: number;
  netValue: number;
  topNetBuy: ForeignFlow[];
  topNetSell: ForeignFlow[];
  unit: VndUnit;
}

/** One recorded session of board-wide foreign flow, in dong. */
export interface MarketForeignDay {
  exchange: Exchange | "ALL";
  date: string;
  buyVolume: number;
  sellVolume: number;
  netVolume: number;
  buyValue: number;
  sellValue: number;
  netValue: number;
  unit: VndUnit;
}

export interface MarketLiquidity {
  index: string;
  date: string;
  /** Session turnover in dong. */
  value: number;
  /** Previous session turnover, null when history is too short. */
  valuePrevious: number | null;
  changePercent: number | null;
  volume: number;
  unit: VndUnit;
}

/** One minute of the session. */
export interface IntradayPoint {
  time: string;
  /** Index level in points. */
  close: number;
  /** Session turnover up to this minute, in dong. */
  value: number;
  /** Previous session's turnover up to the same clock time, null without a previous session. */
  valuePrevious: number | null;
}

export interface MarketIntraday {
  index: string;
  date: string;
  previousDate: string | null;
  /** Minutes with trades, oldest first; the lunch break has none and the closing auction is one 14:45 point. */
  points: IntradayPoint[];
  /** The last point against the previous session at the same clock time; changePercent in percent. */
  liquidity: { value: number; valuePrevious: number | null; changePercent: number | null; unit: VndUnit };
  /** Board breadth when called, not over time. */
  breadth: MarketBreadth;
  unit: VndUnit;
}

export interface MarketOverview {
  date: string;
  index: IndexSnapshot;
  liquidity: MarketLiquidity;
  breadth: MarketBreadth;
  foreign: MarketForeignFlow;
}

export interface MarketContext {
  date: string;
  index: IndexSnapshot;
  regime: MarketRegime;
  rationale: string;
  liquidity: { value: number; avg20: number; ratio: number; signal: "above_average" | "below_average" | "normal"; unit: VndUnit };
  /** Null for a past session: the price board only shows the current one. */
  breadth: MarketBreadth | null;
  foreign: MarketForeignFlow | null;
  /** Explains every null above. */
  notes: string[];
}

export interface MarketSource {
  fetchBars(params: BarsParams): Promise<Record<string, Bar[]>>;
  fetchQuotes(symbols: string[]): Promise<Quote[]>;
  fetchSymbolsByGroup(group: string): Promise<{ symbol: string }[]>;
}

export interface ClockOption {
  /** Clock for "today", in ms. */
  now?: number;
}

export interface ExchangeOption extends ClockOption {
  /** HOSE (default), HNX, UPCOM or ALL; HSX is read as HOSE. */
  exchange?: Exchange | "ALL";
}

const EXCHANGES: Exchange[] = ["HOSE", "HNX", "UPCOM"];
const DEFAULT_INDEX = "VNINDEX";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Rounds to 3 decimals; not a unit change. */
function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function shiftDays(date: string, days: number): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().substring(0, 10);
}

export function normalizeExchange(exchange: string | undefined): Exchange | "ALL" {
  const e = (exchange || "HOSE").toUpperCase();
  const v = e === "HSX" ? "HOSE" : e;
  if (v === "ALL" || EXCHANGES.includes(v as Exchange)) return v as Exchange | "ALL";
  throw new InvalidParameterError("exchange", exchange, [...EXCHANGES, "ALL"], "HSX is accepted as HOSE.");
}

function hasTraded(q: Quote): boolean {
  return q.price > 0 && q.ref > 0;
}

/** Foreign flow of one quote: volume x average price (match price before any average), in dong. */
export function symbolFlow(q: Quote, date: string): ForeignFlow {
  const price = q.avg > 0 ? q.avg : q.price;
  const buyVolume = q.foreignBuyVolume || 0;
  const sellVolume = q.foreignSellVolume || 0;
  const buyValue = Math.round(buyVolume * price);
  const sellValue = Math.round(sellVolume * price);
  return {
    symbol: q.symbol,
    date,
    buyVolume,
    sellVolume,
    netVolume: buyVolume - sellVolume,
    buyValue,
    sellValue,
    netValue: buyValue - sellValue,
    unit: "VND",
  };
}

/** Board-wide foreign flow in dong with the top net buyers and sellers. */
export function marketFlow(quotes: Quote[], exchange: Exchange | "ALL", date: string, top: number = 10): MarketForeignFlow {
  const flows: ForeignFlow[] = [];
  let buyVolume = 0;
  let sellVolume = 0;
  let buyValue = 0;
  let sellValue = 0;
  for (const q of quotes) {
    if (!hasTraded(q)) continue;
    if (!q.foreignBuyVolume && !q.foreignSellVolume) continue;
    const f = symbolFlow(q, date);
    flows.push(f);
    buyVolume += f.buyVolume;
    sellVolume += f.sellVolume;
    buyValue += f.buyValue;
    sellValue += f.sellValue;
  }
  const byNetDesc = flows.slice().sort((a, b) => b.netValue - a.netValue);
  return {
    exchange,
    date,
    buyVolume,
    sellVolume,
    netVolume: buyVolume - sellVolume,
    buyValue,
    sellValue,
    netValue: buyValue - sellValue,
    topNetBuy: byNetDesc.filter((f) => f.netValue > 0).slice(0, top),
    topNetSell: byNetDesc
      .filter((f) => f.netValue < 0)
      .slice(-top)
      .reverse(),
    unit: "VND",
  };
}

/** Foreign flow of one symbol per recorded session, zeros on sessions it had no foreign trade. */
export function symbolSeries(days: ForeignDay[], symbol: string): ForeignFlow[] {
  const sym = symbol.toUpperCase();
  return days.map((d) => {
    const r = d.rows.find((x) => x[0] === sym);
    const [buyVolume, sellVolume, buyValue, sellValue] = r ? [r[2], r[3], r[4], r[5]] : [0, 0, 0, 0];
    return {
      symbol: sym,
      date: d.date,
      buyVolume,
      sellVolume,
      netVolume: buyVolume - sellVolume,
      buyValue,
      sellValue,
      netValue: buyValue - sellValue,
      unit: "VND",
    };
  });
}

/** Board-wide foreign flow per recorded session, summed from the symbol rows of an exchange or all three. */
export function marketSeries(days: ForeignDay[], exchange: Exchange | "ALL"): MarketForeignDay[] {
  return days.map((d) => {
    let buyVolume = 0;
    let sellVolume = 0;
    let buyValue = 0;
    let sellValue = 0;
    for (const r of d.rows) {
      if (exchange !== "ALL" && r[1] !== exchange) continue;
      buyVolume += r[2];
      sellVolume += r[3];
      buyValue += r[4];
      sellValue += r[5];
    }
    return {
      exchange,
      date: d.date,
      buyVolume,
      sellVolume,
      netVolume: buyVolume - sellVolume,
      buyValue,
      sellValue,
      netValue: buyValue - sellValue,
      unit: "VND",
    };
  });
}

/** Session turnover of an index in dong, against the previous session. */
export function liquidityOf(bars: Bar[], index: string): MarketLiquidity {
  if (bars.length === 0) throw new Error("No index bars available for " + index);
  const last = bars[bars.length - 1];
  const prev = bars.length > 1 ? bars[bars.length - 2] : null;
  const value = last.value ?? 0;
  const valuePrevious = prev && prev.value !== null ? prev.value : null;
  return {
    index,
    date: last.time,
    value,
    valuePrevious,
    changePercent: valuePrevious !== null && valuePrevious !== 0 ? round3(((value - valuePrevious) / valuePrevious) * 100) : null,
    volume: last.volume,
    unit: "VND",
  };
}

/** Mean turnover in dong of the most recent `period` bars that carry one. */
export function averageLiquidityOf(bars: Bar[], period: number = 20): number {
  const vals: number[] = [];
  for (let i = bars.length - 1; i >= 0 && vals.length < period; i--) {
    const v = bars[i].value;
    if (v !== null) vals.push(v);
  }
  if (vals.length === 0) return 0;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

/** Turnover curve of the last session in minute bars against the session before it, by clock time. */
export function intradayOf(bars: Bar[], index: string): Omit<MarketIntraday, "breadth"> {
  if (bars.length === 0) throw new Error("No intraday bars available for " + index);
  const date = bars[bars.length - 1].time.substring(0, 10);
  const today = bars.filter((b) => b.time.substring(0, 10) === date);
  const earlier = bars.filter((b) => b.time.substring(0, 10) < date);
  const previousDate = earlier.length > 0 ? earlier[earlier.length - 1].time.substring(0, 10) : null;
  const prev = earlier.filter((b) => b.time.substring(0, 10) === previousDate);

  const points: IntradayPoint[] = [];
  let value = 0;
  let prevValue: number | null = null;
  let j = 0;
  for (const b of today) {
    if (b.value !== null) value = b.value;
    const clock = b.time.substring(11, 19);
    while (j < prev.length && prev[j].time.substring(11, 19) <= clock) {
      const v = prev[j].value;
      if (v !== null) prevValue = v;
      j++;
    }
    points.push({ time: b.time, close: b.close, value, valuePrevious: previousDate === null ? null : prevValue });
  }
  const last = points[points.length - 1];
  const vp = last.valuePrevious;
  return {
    index,
    date,
    previousDate,
    points,
    liquidity: { value: last.value, valuePrevious: vp, changePercent: vp !== null && vp !== 0 ? round3(((last.value - vp) / vp) * 100) : null, unit: "VND" },
    unit: "VND",
  };
}

/** Last index level in points with the change against the previous bar. */
export function indexSnapshot(bars: Bar[], symbol: string): IndexSnapshot {
  if (bars.length === 0) throw new Error("No index bars available for " + symbol);
  const last = bars[bars.length - 1];
  const prev = bars.length > 1 ? bars[bars.length - 2] : null;
  return {
    symbol,
    date: last.time,
    close: last.close,
    open: last.open,
    high: last.high,
    low: last.low,
    change: prev ? round3(last.close - prev.close) : null,
    changePercent: prev && prev.close !== 0 ? round3(((last.close - prev.close) / prev.close) * 100) : null,
    volume: last.volume,
  };
}

/** Advancers, decliners, ceiling and floor counts; symbols that have not traded are left out. */
export function breadthOf(quotes: Quote[], exchange: Exchange | "ALL", date: string): MarketBreadth {
  return computeBreadth(quotes, exchange, date);
}

/**
 * Daily bars of an index, in points.
 * @example
 * const bars = await indexHistory(source, "VNINDEX", { countBack: 260 });
 */
export async function indexHistory(
  source: MarketSource,
  symbol: string = DEFAULT_INDEX,
  options: { asOf?: string; countBack?: number } & ClockOption = {}
): Promise<Bar[]> {
  const sym = symbol.toUpperCase();
  if (!isIndexSymbol(sym)) throw new InvalidParameterError("index", symbol, ["VNINDEX", "VN30", "VN100", "HNXINDEX", "HNX30", "HNXUPCOMINDEX"]);
  if (options.asOf !== undefined && !DATE_RE.test(options.asOf)) throw new InvalidParameterError("asOf", options.asOf, undefined, "Dates are YYYY-MM-DD.");
  const countBack = options.countBack ?? 260;
  const to = options.asOf || ictToday(options.now);
  // Calendar days, padded for weekends and holidays so countBack sessions land.
  const from = shiftDays(to, -(Math.ceil(countBack * 1.6) + 10));
  const res = await source.fetchBars({ symbols: [sym], from, to, frame: "ONE_DAY", countBack });
  return res[sym] || [];
}

/** The price board carries no date and still serves the last session on holidays, so read it off the index. */
async function sessionDate(source: MarketSource, now?: number): Promise<string> {
  const bars = await indexHistory(source, DEFAULT_INDEX, { countBack: 5, now });
  return bars.length > 0 ? bars[bars.length - 1].time : "";
}

// Fetched per exchange rather than as one ~1500-symbol request so a failure stays scoped.
async function quotesFor(source: MarketSource, exchange: Exchange | "ALL"): Promise<Quote[]> {
  const targets = exchange === "ALL" ? EXCHANGES : [exchange];
  const boards = await Promise.all(
    targets.map(async (ex) => {
      const symbols = (await source.fetchSymbolsByGroup(ex)).map((s) => s.symbol);
      return symbols.length === 0 ? [] : source.fetchQuotes(symbols);
    })
  );
  return boards.reduce<Quote[]>((all, b) => all.concat(b), []);
}

/**
 * Session turnover of an index in dong.
 * @example
 * (await liquidity(source)).value // 2.1e13
 */
export async function liquidity(source: MarketSource, options: { index?: string; asOf?: string } & ClockOption = {}): Promise<MarketLiquidity> {
  const symbol = (options.index ?? DEFAULT_INDEX).toUpperCase();
  return liquidityOf(await indexHistory(source, symbol, { asOf: options.asOf, countBack: 30, now: options.now }), symbol);
}

// Two sessions are about 455 minute bars; VCI returns countBack bars ending at `to`.
const INTRADAY_COUNT_BACK = 600;

/**
 * Turnover by minute of the current (or last) session against the previous session at the same
 * clock time, with board breadth now. Money in dong, the index in points.
 * @example
 * const d = await intraday(source, { exchange: "HOSE" });
 */
export async function intraday(source: MarketSource, options: ExchangeOption & { index?: string } = {}): Promise<MarketIntraday> {
  const exchange = normalizeExchange(options.exchange);
  const symbol = (options.index ?? DEFAULT_INDEX).toUpperCase();
  if (!isIndexSymbol(symbol)) throw new InvalidParameterError("index", options.index, ["VNINDEX", "VN30", "VN100", "HNXINDEX", "HNX30", "HNXUPCOMINDEX"]);
  const to = ictToday(options.now);
  const [res, quotes] = await Promise.all([
    source.fetchBars({ symbols: [symbol], from: shiftDays(to, -10), to, frame: "ONE_MINUTE", countBack: INTRADAY_COUNT_BACK }),
    quotesFor(source, exchange),
  ]);
  const curve = intradayOf(res[symbol] || [], symbol);
  return { ...curve, breadth: breadthOf(quotes, exchange, curve.date) };
}

/**
 * Advance/decline counts of the current session.
 * @example
 * const b = await breadth(source, { exchange: "HOSE" });
 */
export async function breadth(source: MarketSource, options: ExchangeOption = {}): Promise<MarketBreadth> {
  const exchange = normalizeExchange(options.exchange);
  const [quotes, date] = await Promise.all([quotesFor(source, exchange), sessionDate(source, options.now)]);
  return breadthOf(quotes, exchange, date);
}

/**
 * Foreign buy/sell of the current session in dong, with top net buyers and sellers.
 * @example
 * (await foreignFlow(source, { top: 5 })).netValue
 */
export async function foreignFlow(source: MarketSource, options: ExchangeOption & { top?: number } = {}): Promise<MarketForeignFlow> {
  const exchange = normalizeExchange(options.exchange);
  const [quotes, date] = await Promise.all([quotesFor(source, exchange), sessionDate(source, options.now)]);
  return marketFlow(quotes, exchange, date, options.top ?? 10);
}

/**
 * Current-session foreign flow of one symbol in dong.
 * @example
 * (await symbolForeignFlow(source, "FPT")).netValue
 */
export async function symbolForeignFlow(source: MarketSource, symbol: string, options: ClockOption = {}): Promise<ForeignFlow> {
  const sym = symbol.toUpperCase();
  const [quotes, date] = await Promise.all([source.fetchQuotes([sym]), sessionDate(source, options.now)]);
  if (quotes.length === 0 || !quotes[0] || !quotes[0].symbol) throw new InvalidParameterError("symbol", symbol, ["a listed symbol"]);
  return symbolFlow(quotes[0], date);
}

/**
 * Index, liquidity, breadth and foreign flow in one call, sharing a single board fetch.
 * @example
 * const o = await overview(source, { exchange: "HOSE" });
 */
export async function overview(source: MarketSource, options: ExchangeOption & { index?: string; top?: number } = {}): Promise<MarketOverview> {
  const exchange = normalizeExchange(options.exchange);
  const symbol = (options.index ?? DEFAULT_INDEX).toUpperCase();
  const [bars, quotes] = await Promise.all([indexHistory(source, symbol, { countBack: 30, now: options.now }), quotesFor(source, exchange)]);
  const snapshot = indexSnapshot(bars, symbol);
  return {
    date: snapshot.date,
    index: snapshot,
    liquidity: liquidityOf(bars, symbol),
    breadth: breadthOf(quotes, exchange, snapshot.date),
    foreign: marketFlow(quotes, exchange, snapshot.date, options.top ?? 10),
  };
}

/**
 * Market regime, liquidity against its 20-session norm, breadth and foreign flow, shaped for an
 * LLM. With asOf, breadth and foreign flow are null and `notes` says why.
 * @example
 * const ctx = await marketContext(source, { asOf: "2026-06-30" });
 */
export async function marketContext(source: MarketSource, options: ExchangeOption & { index?: string; asOf?: string } = {}): Promise<MarketContext> {
  const exchange = normalizeExchange(options.exchange);
  const symbol = (options.index ?? DEFAULT_INDEX).toUpperCase();
  const notes: string[] = [];
  const bars = await indexHistory(source, symbol, { asOf: options.asOf, countBack: 260, now: options.now });
  const snapshot = indexSnapshot(bars, symbol);
  const liq = liquidityOf(bars, symbol);
  const avg20 = averageLiquidityOf(bars, 20);
  const regime = classifyRegime(bars);

  let breadthOut: MarketBreadth | null = null;
  let foreignOut: MarketForeignFlow | null = null;
  if (options.asOf) {
    notes.push("breadth and foreign flow are omitted for asOf=" + options.asOf + ": the upstream only exposes them for the current session");
  } else {
    const quotes = await quotesFor(source, exchange);
    breadthOut = breadthOf(quotes, exchange, snapshot.date);
    foreignOut = marketFlow(quotes, exchange, snapshot.date, 10);
  }

  return {
    date: snapshot.date,
    index: snapshot,
    regime: regime.regime,
    rationale: regime.rationale,
    liquidity: {
      value: liq.value,
      avg20,
      ratio: avg20 === 0 ? 0 : round3(liq.value / avg20),
      signal: liquiditySignal(liq.value, avg20),
      unit: "VND",
    },
    breadth: breadthOut,
    foreign: foreignOut,
    notes,
  };
}
