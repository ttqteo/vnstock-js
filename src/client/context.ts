import { Bar } from "../types";
import { BarsParams } from "../adapters/types";
import { InvalidParameterError } from "../errors";
import { ictToday, isIndexSymbol } from "../shared/time";
import { detectPivots } from "../core/stock/pivot";
import { AIContext, classifyTrend, snapshotIndicators, classifyVolume, computePerformance, formatAIPrompt } from "../core/stock/ai-context";

export type { AIContext } from "../core/stock/ai-context";

export interface BarSource {
  fetchBars(params: BarsParams): Promise<Record<string, Bar[]>>;
}

export interface ContextOptions {
  /** Sessions the indicators are computed over. Default 200. */
  lookback?: number;
  /** YYYY-MM-DD; only bars up to this date are used. Default today in ICT. */
  asOf?: string;
  /** Clock for "today", in ms. */
  now?: number;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function shiftDays(date: string, days: number): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().substring(0, 10);
}

/**
 * Trend, indicators, levels, volume and performance of one symbol from daily bars, ready to hand
 * to an LLM. Prices stay in dong (indices in points); the trend strength does not depend on the
 * price level.
 * @example
 * const ctx = await buildContext(source, "FPT", { lookback: 200 });
 * ctx.trend.direction // "bullish"
 */
export async function buildContext(source: BarSource, symbol: string, options: ContextOptions = {}): Promise<AIContext> {
  const lookback = options.lookback ?? 200;
  if (!(lookback >= 1)) throw new InvalidParameterError("lookback", lookback, undefined, "lookback is a number of sessions, e.g. 200.");
  if (options.asOf !== undefined && !DATE_RE.test(options.asOf)) {
    throw new InvalidParameterError("asOf", options.asOf, undefined, "Dates are YYYY-MM-DD.");
  }
  const sym = symbol.toUpperCase();
  const to = options.asOf || ictToday(options.now);
  const from = shiftDays(to, -(Math.ceil(lookback * 1.5) + 30));
  const res = await source.fetchBars({ symbols: [sym], from, to, frame: "ONE_DAY", countBack: lookback + 30 });
  // The source may return bars past `to`; asOf must never see them.
  const bars = (res[sym] || []).filter((b) => b.time.substring(0, 10) <= to).slice(-lookback);

  return {
    symbol: sym,
    asOf: bars.length > 0 ? bars[bars.length - 1].time : "",
    trend: classifyTrend(bars),
    indicators: snapshotIndicators(bars),
    levels: detectPivots(bars, { window: 5, topN: 3 }),
    volume: classifyVolume(bars),
    performance: computePerformance(bars),
  };
}

/**
 * A price as people read it: stocks in thousands of dong ("125.8k"), indices in points ("1,748.86").
 * @example
 * priceLabel(125800, "FPT") // "125.8k"
 */
export function priceLabel(value: number, symbol: string): string {
  if (isIndexSymbol(symbol)) return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (value / 1000).toLocaleString("en-US", { maximumFractionDigits: 2 }) + "k";
}

/**
 * The context as prompt text, with prices printed by priceLabel instead of raw dong.
 * @example
 * contextPrompt(await buildContext(source, "FPT"), "vi")
 */
export function contextPrompt(ctx: AIContext, lang: "vi" | "en" = "vi"): string {
  return formatAIPrompt(ctx, lang, (v) => priceLabel(v, ctx.symbol));
}
