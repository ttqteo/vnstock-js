import { Bar, Interval, Quote, Range } from "../types";
import { resolveWindow, sourceInterval } from "./range";
import { resample } from "../compute/resample";
import { InvalidSymbolError } from "../errors";
import { closest } from "../shared/suggest";
import { isIndexSymbol } from "../shared/time";
import { createCompany, financials, Company, FinancialStatement, StatementKind } from "./company";
import { buildContext, contextPrompt, AIContext } from "./context";
import { symbolForeignFlow, symbolSeries, ForeignFlow } from "./market";
import { daysFor } from "../data/foreign";
import { watchWhenReady, TickListener, WatchOptions } from "./watch";
import { startAlert, AlertOptions, AlertListener } from "./alert";
import { checkBacktest, runBacktest, summarize, BacktestOptions, BacktestResult, Signal } from "../compute/backtest";
import { resolveSignal, PresetName } from "../compute/signals";
import { findSimilar, SimilarOptions, SimilarResult } from "../compute/analog";
import { patternReport, PatternReport } from "../indicators/report";
import { marketHealth, MarketHealth, MarketHealthOptions } from "../indicators/oneil";
import type { ClientContext } from "./index";

export type HistoryInput = Range | { from: string; to?: string; interval?: Interval };

export interface ContextInput {
  /** Sessions the indicators are computed over. Default 200. */
  lookback?: number;
  /** YYYY-MM-DD; only bars up to this date are used. */
  asOf?: string;
}

const INDEX_SYMBOLS = ["VNINDEX", "VN30", "VN100", "HNXINDEX", "HNX30", "HNXUPCOMINDEX"];

/** Rounds to 3 decimals; not a unit change. */
function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Shared by stocks and indices: symbol check on first call, history, context. */
abstract class BaseHandle {
  readonly symbol: string;
  private checked: Promise<void> | null = null;

  constructor(
    protected ctx: ClientContext,
    symbol: string
  ) {
    this.symbol = symbol.toUpperCase();
  }

  protected abstract check(): Promise<void>;

  protected ensureKnown(): Promise<void> {
    if (!this.checked) {
      this.checked = this.check();
      // A failed check (offline, unknown symbol) is not kept: the next call checks again.
      this.checked.catch(() => {
        this.checked = null;
      });
    }
    return this.checked;
  }

  /**
   * Candles in dong (points for indices). Ranges: 1d 5d 1mo 3mo 6mo ytd 1y 2y 5y max.
   * Intervals: 1m 5m 15m 30m 1h 1d 1w 1mo; 5m/15m/30m/1w/1mo are built client-side from
   * 1m or daily bars, with 30m slots on the wall clock (09:00 holds 09:15 to 09:29).
   * Intraday history only reaches as far back as the source keeps 1m bars; a longer range
   * returns the bars that exist rather than failing.
   * @example
   * await vn.stock('FPT').history('6mo')
   * await vn.stock('FPT').history({ from: '2025-01-01', interval: '1w' })
   */
  async history(input: HistoryInput = "1y"): Promise<Bar[]> {
    await this.ensureKnown();
    const interval: Interval = typeof input === "object" && input.interval ? input.interval : "1d";
    const win = resolveWindow(typeof input === "object" ? { from: input.from, to: input.to } : input, this.ctx.now());
    const frame = sourceInterval(interval);
    const res = await this.ctx.source.fetchBars({ symbols: [this.symbol], from: win.from, to: win.to, frame });
    let bars = resample(res[this.symbol] || [], interval);
    // Day ranges are calendar padded; keep the sessions asked for.
    if (input === "5d") bars = bars.slice(-5);
    if (input === "1d") bars = bars.slice(-1);
    return bars;
  }

  /**
   * Trend, indicators, levels, volume and performance from daily bars, for an LLM.
   * @example
   * const ctx = await vn.stock('FPT').context({ asOf: '2026-10-10' })
   * ctx.trend.direction // "bullish"
   */
  async context(options: ContextInput = {}): Promise<AIContext> {
    await this.ensureKnown();
    return buildContext(this.ctx.source, this.symbol, { ...options, now: this.ctx.now() });
  }

  /**
   * The context as prompt text, prices as "125.8k" (indices in points).
   * @example
   * await vn.stock('FPT').prompt({ lang: 'en' })
   */
  async prompt(options: ContextInput & { lang?: "vi" | "en" } = {}): Promise<string> {
    return contextPrompt(await this.context(options), options.lang ?? "vi");
  }
}

export class StockHandle extends BaseHandle {
  private companyData: Company | null = null;

  protected async check(): Promise<void> {
    if (isIndexSymbol(this.symbol)) return;
    const all = (await this.ctx.datasets.symbols()).map((s) => s.symbol);
    if (!all.includes(this.symbol)) throw new InvalidSymbolError(this.symbol, closest(this.symbol, all) || undefined);
  }

  private companySections(): Company {
    if (!this.companyData) this.companyData = createCompany(this.ctx.source, this.symbol);
    return this.companyData;
  }

  /**
   * Live price-board row, money in dong.
   * @example
   * const q = await vn.stock('FPT').price()
   * q.price      // 127000
   * q.changePct  // 0.95 (percent)
   */
  async price(): Promise<Quote> {
    await this.ensureKnown();
    const [q] = await this.ctx.source.fetchQuotes([this.symbol]);
    return q;
  }

  /**
   * Company profile. The other company sections share the same request.
   * @example
   * const profile = await vn.stock('FPT').company()
   * profile.industryEn // "Technology"
   */
  async company() {
    await this.ensureKnown();
    return this.companySections().profile();
  }

  /**
   * Major shareholders.
   * @example
   * await vn.stock('FPT').shareholders()
   */
  async shareholders() {
    await this.ensureKnown();
    return this.companySections().shareholders();
  }

  /**
   * Board and management.
   * @example
   * await vn.stock('FPT').officers()
   */
  async officers() {
    await this.ensureKnown();
    return this.companySections().officers();
  }

  /**
   * Corporate events (dividends, meetings, insider deals...), dates in ICT.
   * @example
   * await vn.stock('FPT').events()
   */
  async events() {
    await this.ensureKnown();
    return this.companySections().events();
  }

  /**
   * Dividend events only.
   * @example
   * await vn.stock('FPT').dividends()
   */
  async dividends() {
    await this.ensureKnown();
    return this.companySections().dividends();
  }

  /**
   * Company news from the source, prices in dong.
   * @example
   * await vn.stock('FPT').news()
   */
  async news() {
    await this.ensureKnown();
    return this.companySections().news();
  }

  /**
   * A financial statement or the ratio history, amounts in dong.
   * @example
   * const income = await vn.stock('FPT').financials('income', { period: 'year' })
   */
  async financials(kind: StatementKind, options: { period?: "year" | "quarter" } = {}): Promise<FinancialStatement> {
    await this.ensureKnown();
    return financials(this.ctx.source, this.symbol, kind, options);
  }

  /**
   * Support/resistance zones, extreme zone, recent candle patterns, the latest Turtle signal and
   * volume-confirmed breakouts, from one year of daily bars.
   * @example
   * const p = await vn.stock('FPT').patterns()
   * p.zones[0]       // { low, high, kind: "support", touches, lastTouch }
   * p.turtle?.action // "buy"
   */
  async patterns(options: { recent?: number } = {}): Promise<PatternReport> {
    return patternReport(await this.history("1y"), options);
  }

  /**
   * Foreign buy/sell of the current session from the price board, in dong.
   * @example
   * (await vn.stock('FPT').foreign()).netValue
   */
  foreign(): Promise<ForeignFlow>;
  /**
   * Foreign buy/sell per recorded session over a range, oldest first, in dong. Recording began in
   * 2026, earlier sessions are absent; a session without foreign trades in this stock shows zeros.
   * @example
   * const days = await vn.stock('FPT').foreign('3mo')
   * days.reduce((sum, d) => sum + d.netValue, 0)
   */
  foreign(range: Range | { from: string; to?: string }): Promise<ForeignFlow[]>;
  async foreign(range?: Range | { from: string; to?: string }): Promise<ForeignFlow | ForeignFlow[]> {
    await this.ensureKnown();
    if (range === undefined) return symbolForeignFlow(this.ctx.source, this.symbol, { now: this.ctx.now() });
    return symbolSeries(await daysFor(this.ctx.foreign, range, this.ctx.now()), this.symbol);
  }

  /**
   * Live ticks for this stock, money in dong. Returns a function that stops watching. The symbol
   * is checked first; an unknown one goes to onError and nothing is watched.
   * @example
   * const stop = vn.stock('FPT').watch((t) => console.log(t.price, t.changePct))
   * stop()
   */
  watch(cb: TickListener, options: WatchOptions = {}): () => void {
    return watchWhenReady(this.ctx.watch, this.ensureKnown(), [this.symbol], cb, options);
  }

  /**
   * Calls back when a rule holds on live ticks and returns a function that stops it. 'breakout'
   * fires once per session when the price trades above the highest high of the previous `lookback`
   * sessions (default 20); a function fires each time it turns from false to true. Nothing is
   * stored: the alert lives as long as the process. Money in dong.
   * @example
   * const stop = vn.stock('FPT').alert({ when: 'breakout' }, (e) => console.log(e.price, e.level))
   * vn.stock('FPT').alert({ when: (t) => t.price >= 130000, mode: 'poll' }, (e) => console.log(e.time))
   * stop()
   */
  alert(options: AlertOptions, cb: AlertListener): () => void {
    return startAlert({
      symbol: this.symbol,
      hub: this.ctx.watch,
      ready: this.ensureKnown(),
      dailyBars: () => this.history("1y"),
      now: this.ctx.now,
      options,
      cb,
    });
  }

  /**
   * Event study of a signal on daily bars (default range 2y): each signal enters at the next open
   * and exits at the take-profit, the stop-loss (assumed first when one session touches both) or the
   * close after `hold` sessions. tp, sl and ret are percent; one open trade at a time unless
   * `overlap`. Pass a function of the bars so far, or a preset: 'breakout', 'oversold_bounce', 'ema_cross'.
   * No fees, slippage or price limits.
   * @example
   * const r = await vn.stock('FPT').backtest('breakout', { tp: 7, sl: 4, hold: 10 })
   * r.stats.all.winRate // 0.55
   * await vn.stock('FPT').backtest((bars) => bars[bars.length - 1].close > bars[bars.length - 2].high, { tp: 5, sl: 3, hold: 5, range: '5y' })
   */
  async backtest(signal: Signal | PresetName, options: BacktestOptions & { range?: Range | { from: string; to?: string } }): Promise<BacktestResult> {
    const fn = resolveSignal(signal);
    checkBacktest(options);
    const trades = runBacktest(this.symbol, await this.history(options.range ?? "2y"), fn, options);
    return { trades, stats: summarize(trades) };
  }

  /**
   * Past sessions whose setup (RSI, MACD histogram, volume z-score, EMA slope, distance to the
   * 52-week high) looks like the last one, with the percent change 5, 20 and 60 sessions later.
   * Reads 5 years of daily bars by default. Experimental: similar setups do not imply similar outcomes.
   * @experimental
   * @example
   * const s = await vn.stock('FPT').similar({ top: 10 })
   * s.summary.ret20.avg
   */
  async similar(options: SimilarOptions & { range?: Range } = {}): Promise<SimilarResult> {
    return findSimilar(this.symbol, await this.history(options.range ?? "5y"), options);
  }
}

export class IndexHandle extends BaseHandle {
  protected async check(): Promise<void> {
    if (!isIndexSymbol(this.symbol)) throw new InvalidSymbolError(this.symbol, closest(this.symbol, INDEX_SYMBOLS) || undefined);
  }

  /**
   * Market health from one year of daily bars: follow-through and distribution days, theo phương
   * pháp của William O'Neil, and an uptrend / pressure / correction status.
   * @example
   * const h = await vn.index('VNINDEX').health()
   * h.status            // "uptrend"
   * h.distributionCount // 3
   */
  async health(options: MarketHealthOptions = {}): Promise<MarketHealth> {
    return marketHealth(await this.history("1y"), options);
  }

  /**
   * Latest index level in points, against the previous session.
   * @example
   * const q = await vn.index('VNINDEX').price()
   * q.price // 1717.2
   */
  async price(): Promise<Quote> {
    const bars = await this.history("5d");
    const last = bars[bars.length - 1];
    const prev = bars.length > 1 ? bars[bars.length - 2] : null;
    const price = last ? last.close : 0;
    const ref = prev ? prev.close : 0;
    const change = last && prev ? round3(price - ref) : 0;
    return {
      symbol: this.symbol,
      name: this.symbol,
      nameEn: this.symbol,
      exchange: "",
      price,
      change,
      changePct: ref ? round3((change / ref) * 100) : 0,
      ref,
      ceiling: 0,
      floor: 0,
      high: last ? last.high : 0,
      low: last ? last.low : 0,
      avg: 0,
      volume: last ? last.volume : 0,
      value: last && last.value !== null ? last.value : 0,
      foreignBuyVolume: 0,
      foreignSellVolume: 0,
      matchVolume: 0,
      bids: [],
      asks: [],
    };
  }
}
