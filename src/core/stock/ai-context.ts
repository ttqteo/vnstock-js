import { QuoteHistory } from "../../models/normalized";
import { StockDataAdapter } from "../../adapters/types";
import { sma } from "../../indicators/sma";
import { ema } from "../../indicators/ema";
import { rsi } from "../../indicators/rsi";
import { macd } from "../../indicators/macd";
import { bollinger } from "../../indicators/bollinger";
import { atr } from "../../indicators/atr";
import { detectPivots, PivotLevels } from "./pivot";

export interface TrendInfo {
  direction: "bullish" | "bearish" | "neutral";
  strength: number;
  rationale: string;
}

export interface IndicatorSnapshot {
  rsi14: number | null;
  macd: { line: number | null; signal: number | null; histogram: number | null; crossover: "bullish" | "bearish" | "none" };
  sma: { 20: number | null; 50: number | null; 200: number | null };
  ema: { 20: number | null; 50: number | null; 200: number | null };
  bollinger: { upper: number | null; middle: number | null; lower: number | null; percentB: number | null };
  atr14: number | null;
}

export interface VolumeInfo {
  today: number;
  avg20: number;
  signal: "above_average" | "below_average" | "normal";
  zscore: number;
}

export interface PerformanceInfo {
  change1d: number | null;
  change7d: number | null;
  change30d: number | null;
  change90d: number | null;
}

export interface AIContext {
  symbol: string;
  asOf: string;
  trend: TrendInfo;
  indicators: IndicatorSnapshot;
  levels: PivotLevels;
  volume: VolumeInfo;
  performance: PerformanceInfo;
}

function lastValue<T extends { ema?: number | null; sma?: number | null; rsi?: number | null }>(
  series: T[],
  key: "ema" | "sma" | "rsi"
): number | null {
  if (series.length === 0) return null;
  const v = (series[series.length - 1] as any)[key];
  return v === undefined ? null : v;
}

function computeSlope(values: (number | null)[]): number {
  const clean = values.filter((v) => v !== null) as number[];
  if (clean.length < 2) return 0;
  const n = clean.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += clean[i];
    sumXY += i * clean[i];
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

export function classifyTrend(data: QuoteHistory[]): TrendInfo {
  if (data.length < 50) {
    return { direction: "neutral", strength: 0, rationale: "Không đủ dữ liệu (cần ≥50 phiên)" };
  }

  const ema20Series = ema(data, { period: 20 });
  const ema50Series = ema(data, { period: 50 });
  const ema200Series = data.length >= 200 ? ema(data, { period: 200 }) : null;

  const e20 = lastValue(ema20Series, "ema");
  const e50 = lastValue(ema50Series, "ema");
  const e200 = ema200Series ? lastValue(ema200Series, "ema") : null;

  const recent20 = ema20Series.slice(-5).map((p) => p.ema);
  const slope = computeSlope(recent20);

  if (e20 === null || e50 === null) {
    return { direction: "neutral", strength: 0, rationale: "Không đủ dữ liệu indicator" };
  }

  let direction: "bullish" | "bearish" | "neutral";
  let rationale: string;
  let strength = 0;

  if (e20 > e50 && (e200 === null || e50 > e200) && slope > 0) {
    direction = "bullish";
    rationale = "EMA20 > EMA50" + (e200 !== null ? " > EMA200" : "") + ", slope EMA20 dương 5 phiên";
    strength = Math.min(1, Math.abs(slope) * 10);
  } else if (e20 < e50 && (e200 === null || e50 < e200) && slope < 0) {
    direction = "bearish";
    rationale = "EMA20 < EMA50" + (e200 !== null ? " < EMA200" : "") + ", slope EMA20 âm 5 phiên";
    strength = Math.min(1, Math.abs(slope) * 10);
  } else {
    direction = "neutral";
    rationale = "EMA chuỗi không nhất quán hoặc slope flat — sideway";
    strength = 0.3;
  }

  return { direction, strength, rationale };
}

export function snapshotIndicators(data: QuoteHistory[]): IndicatorSnapshot {
  const rsiSeries = rsi(data, { period: 14 });
  const macdSeries = macd(data);
  const sma20 = data.length >= 20 ? lastValue(sma(data, { period: 20 }), "sma") : null;
  const sma50 = data.length >= 50 ? lastValue(sma(data, { period: 50 }), "sma") : null;
  const sma200 = data.length >= 200 ? lastValue(sma(data, { period: 200 }), "sma") : null;
  const ema20 = data.length >= 20 ? lastValue(ema(data, { period: 20 }), "ema") : null;
  const ema50 = data.length >= 50 ? lastValue(ema(data, { period: 50 }), "ema") : null;
  const ema200 = data.length >= 200 ? lastValue(ema(data, { period: 200 }), "ema") : null;
  const bollSeries = bollinger(data, { period: 20 });
  const atrSeries = atr(data, 14);

  const lastRsi = rsiSeries.length > 0 ? rsiSeries[rsiSeries.length - 1].rsi : null;
  const lastMacd = macdSeries.length > 0 ? macdSeries[macdSeries.length - 1] : null;
  const prevMacd = macdSeries.length > 1 ? macdSeries[macdSeries.length - 2] : null;
  const lastBoll = bollSeries.length > 0 ? bollSeries[bollSeries.length - 1] : null;
  const lastAtr = atrSeries.length > 0 ? atrSeries[atrSeries.length - 1].atr : null;

  let crossover: "bullish" | "bearish" | "none" = "none";
  if (lastMacd && prevMacd && lastMacd.histogram !== null && prevMacd.histogram !== null) {
    if (prevMacd.histogram <= 0 && lastMacd.histogram > 0) crossover = "bullish";
    else if (prevMacd.histogram >= 0 && lastMacd.histogram < 0) crossover = "bearish";
  }

  return {
    rsi14: lastRsi,
    macd: {
      line: lastMacd?.macd ?? null,
      signal: lastMacd?.signal ?? null,
      histogram: lastMacd?.histogram ?? null,
      crossover,
    },
    sma: { 20: sma20, 50: sma50, 200: sma200 },
    ema: { 20: ema20, 50: ema50, 200: ema200 },
    bollinger: {
      upper: lastBoll?.upper ?? null,
      middle: lastBoll?.middle ?? null,
      lower: lastBoll?.lower ?? null,
      percentB: lastBoll?.percentB ?? null,
    },
    atr14: lastAtr,
  };
}

export function classifyVolume(data: QuoteHistory[]): VolumeInfo {
  if (data.length < 21) {
    const last = data[data.length - 1];
    return { today: last?.volume ?? 0, avg20: 0, signal: "normal", zscore: 0 };
  }
  const volumes = data.map((c) => c.volume);
  const today = volumes[volumes.length - 1];
  const prev20 = volumes.slice(-21, -1);
  const mean = prev20.reduce((a, b) => a + b, 0) / 20;
  let variance = 0;
  for (const v of prev20) variance += (v - mean) * (v - mean);
  const sd = Math.sqrt(variance / 20);
  let zscore: number;
  let signal: "above_average" | "below_average" | "normal";
  if (sd > 0) {
    zscore = (today - mean) / sd;
    signal = zscore > 2 ? "above_average" : zscore < -1 ? "below_average" : "normal";
  } else {
    // Constant historical volume — fall back to ratio comparison
    zscore = mean > 0 ? (today - mean) / mean : 0;
    if (mean === 0) signal = "normal";
    else if (today >= mean * 2) signal = "above_average";
    else if (today <= mean * 0.5) signal = "below_average";
    else signal = "normal";
  }
  return { today, avg20: mean, signal, zscore };
}

export function computePerformance(data: QuoteHistory[]): PerformanceInfo {
  if (data.length === 0) return { change1d: null, change7d: null, change30d: null, change90d: null };
  const last = data[data.length - 1].close;
  function chg(daysBack: number): number | null {
    const idx = data.length - 1 - daysBack;
    if (idx < 0) return null;
    const ref = data[idx].close;
    return ref > 0 ? (last - ref) / ref : null;
  }
  return { change1d: chg(1), change7d: chg(7), change30d: chg(30), change90d: chg(90) };
}

export async function buildAIContext(
  adapter: StockDataAdapter,
  symbol: string,
  options: { lookback?: number } = {}
): Promise<AIContext> {
  const lookback = options.lookback ?? 200;
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - Math.ceil(lookback * 1.5) - 30);
  const startStr = start.toISOString().substring(0, 10);

  const candles = await adapter.fetchQuoteHistory({
    symbols: [symbol],
    start: startStr,
    timeFrame: "1D",
    countBack: lookback + 30,
  });

  const sliced = candles.slice(-lookback);

  return {
    symbol,
    asOf: sliced.length > 0 ? sliced[sliced.length - 1].date : "",
    trend: classifyTrend(sliced),
    indicators: snapshotIndicators(sliced),
    levels: detectPivots(sliced, { window: 5, topN: 3 }),
    volume: classifyVolume(sliced),
    performance: computePerformance(sliced),
  };
}

export function formatAIPrompt(ctx: AIContext, lang: "vi" | "en" = "vi"): string {
  const lines: string[] = [];
  if (lang === "vi") {
    lines.push(`=== ${ctx.symbol} — ${ctx.asOf} ===`);
    lines.push(`Trend: ${ctx.trend.direction} (strength ${(ctx.trend.strength * 100).toFixed(0)}%) — ${ctx.trend.rationale}`);
    const ind = ctx.indicators;
    lines.push(`RSI(14): ${ind.rsi14?.toFixed(1) ?? "n/a"}`);
    lines.push(`MACD: line ${ind.macd.line?.toFixed(3) ?? "n/a"}, signal ${ind.macd.signal?.toFixed(3) ?? "n/a"}, histogram ${ind.macd.histogram?.toFixed(3) ?? "n/a"}, crossover: ${ind.macd.crossover}`);
    lines.push(`SMA: 20=${ind.sma[20]?.toFixed(2) ?? "n/a"}, 50=${ind.sma[50]?.toFixed(2) ?? "n/a"}, 200=${ind.sma[200]?.toFixed(2) ?? "n/a"}`);
    lines.push(`EMA: 20=${ind.ema[20]?.toFixed(2) ?? "n/a"}, 50=${ind.ema[50]?.toFixed(2) ?? "n/a"}, 200=${ind.ema[200]?.toFixed(2) ?? "n/a"}`);
    lines.push(`Bollinger %B: ${ind.bollinger.percentB?.toFixed(2) ?? "n/a"} (upper=${ind.bollinger.upper?.toFixed(2) ?? "n/a"}, lower=${ind.bollinger.lower?.toFixed(2) ?? "n/a"})`);
    lines.push(`ATR(14): ${ind.atr14?.toFixed(3) ?? "n/a"}`);
    lines.push(`Volume: ${ctx.volume.today.toLocaleString()} (avg ${ctx.volume.avg20.toLocaleString()}, z-score ${ctx.volume.zscore.toFixed(2)}, ${ctx.volume.signal})`);
    lines.push(`Support: ${ctx.levels.support.map((v) => v.toFixed(2)).join(" / ") || "n/a"}`);
    lines.push(`Resistance: ${ctx.levels.resistance.map((v) => v.toFixed(2)).join(" / ") || "n/a"}`);
    const perf = ctx.performance;
    const fmtPct = (v: number | null) => (v === null ? "n/a" : (v >= 0 ? "+" : "") + (v * 100).toFixed(2) + "%");
    lines.push(`Change: 1d ${fmtPct(perf.change1d)} · 7d ${fmtPct(perf.change7d)} · 30d ${fmtPct(perf.change30d)} · 90d ${fmtPct(perf.change90d)}`);
  } else {
    lines.push(`=== ${ctx.symbol} — ${ctx.asOf} ===`);
    lines.push(`Trend: ${ctx.trend.direction} (strength ${(ctx.trend.strength * 100).toFixed(0)}%) — ${ctx.trend.rationale}`);
    const ind = ctx.indicators;
    lines.push(`RSI(14): ${ind.rsi14?.toFixed(1) ?? "n/a"}`);
    lines.push(`MACD: line ${ind.macd.line?.toFixed(3) ?? "n/a"}, signal ${ind.macd.signal?.toFixed(3) ?? "n/a"}, crossover: ${ind.macd.crossover}`);
    lines.push(`SMA: 20=${ind.sma[20]?.toFixed(2) ?? "n/a"}, 50=${ind.sma[50]?.toFixed(2) ?? "n/a"}, 200=${ind.sma[200]?.toFixed(2) ?? "n/a"}`);
    lines.push(`Bollinger %B: ${ind.bollinger.percentB?.toFixed(2) ?? "n/a"}`);
    lines.push(`ATR(14): ${ind.atr14?.toFixed(3) ?? "n/a"}`);
    lines.push(`Volume: ${ctx.volume.today} (z-score ${ctx.volume.zscore.toFixed(2)}, ${ctx.volume.signal})`);
    lines.push(`Support: ${ctx.levels.support.map((v) => v.toFixed(2)).join(" / ") || "n/a"}`);
    lines.push(`Resistance: ${ctx.levels.resistance.map((v) => v.toFixed(2)).join(" / ") || "n/a"}`);
    const perf = ctx.performance;
    const fmtPct = (v: number | null) => (v === null ? "n/a" : (v >= 0 ? "+" : "") + (v * 100).toFixed(2) + "%");
    lines.push(`Change: 1d ${fmtPct(perf.change1d)} · 7d ${fmtPct(perf.change7d)} · 30d ${fmtPct(perf.change30d)} · 90d ${fmtPct(perf.change90d)}`);
  }
  return lines.join("\n");
}
