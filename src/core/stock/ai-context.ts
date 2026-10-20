import { Bar } from "../../types";
import { sma } from "../../indicators/sma";
import { ema } from "../../indicators/ema";
import { rsi } from "../../indicators/rsi";
import { macd } from "../../indicators/macd";
import { bollinger } from "../../indicators/bollinger";
import { atr } from "../../indicators/atr";
import { superTrend } from "../../indicators/supertrend";
import { ichimoku } from "../../indicators/ichimoku";
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
  superTrend: {
    value: number | null;
    direction: "bullish" | "bearish" | null;
  };
  ichimoku: {
    tenkanSen: number | null;
    kijunSen: number | null;
    cloudTop: number | null;
    cloudBottom: number | null;
    priceVsCloud: "above" | "below" | "inside" | null;
    tkCross: "bullish" | "bearish" | "none";
  };
}

export interface VolumeInfo {
  today: number;
  avg20: number;
  signal: "above_average" | "below_average" | "normal";
  zscore: number;
}

/** Close-to-close change over 1, 7, 30 and 90 sessions, in percent: 5.2 is +5.2%. */
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

function lastValue<T extends { ema?: number | null; sma?: number | null; rsi?: number | null }>(series: T[], key: "ema" | "sma" | "rsi"): number | null {
  if (series.length === 0) return null;
  const v = (series[series.length - 1] as any)[key];
  return v === undefined ? null : v;
}

function computeSlope(values: (number | null)[]): number {
  const clean = values.filter((v) => v !== null) as number[];
  if (clean.length < 2) return 0;
  const n = clean.length;
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumXX = 0;
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

export function classifyTrend(data: Bar[]): TrendInfo {
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

  // Slope as percent of EMA20 per session, so the score reads the same for a
  // 5,000 dong penny stock and a 125,000 dong blue chip. The factor 2.5 keeps
  // v1 strengths: 0.05 thousand/session at price 25 is 0.2%/session, and
  // 0.2 x 2.5 = 0.5 = 0.05 x 10.
  const slopePct = e20 !== 0 ? (slope / e20) * 100 : 0;

  const stLast = superTrend(data);
  const stDir = stLast.length > 0 ? stLast[stLast.length - 1].direction : null;

  const ichiSeries = ichimoku(data);
  const lastIchi = ichiSeries.length > 0 ? ichiSeries[ichiSeries.length - 1] : null;
  const lastClose = data[data.length - 1].close;
  let priceVsCloud: "above" | "below" | "inside" | null = null;
  if (lastIchi && lastIchi.cloudTop !== null && lastIchi.cloudBottom !== null) {
    if (lastClose > lastIchi.cloudTop) priceVsCloud = "above";
    else if (lastClose < lastIchi.cloudBottom) priceVsCloud = "below";
    else priceVsCloud = "inside";
  }

  let direction: "bullish" | "bearish" | "neutral";
  let rationale: string;
  let strength = 0;

  if (e20 > e50 && (e200 === null || e50 > e200) && slopePct > 0) {
    direction = "bullish";
    rationale = "EMA20 > EMA50" + (e200 !== null ? " > EMA200" : "") + ", slope EMA20 dương 5 phiên";
    strength = Math.min(1, Math.abs(slopePct) * 2.5);
  } else if (e20 < e50 && (e200 === null || e50 < e200) && slopePct < 0) {
    direction = "bearish";
    rationale = "EMA20 < EMA50" + (e200 !== null ? " < EMA200" : "") + ", slope EMA20 âm 5 phiên";
    strength = Math.min(1, Math.abs(slopePct) * 2.5);
  } else {
    direction = "neutral";
    rationale = "EMA chuỗi không nhất quán hoặc slope flat, sideway";
    strength = 0.3;
  }

  if (stDir !== null || priceVsCloud !== null) {
    const stBull = stDir === "bullish";
    const stBear = stDir === "bearish";
    const cloudBull = priceVsCloud === "above";
    const cloudBear = priceVsCloud === "below";

    if (direction === "bullish") {
      if (stBull && cloudBull) {
        strength = Math.min(1, strength + 0.2);
        rationale += " · ST + Ichimoku confirm bullish";
      } else if (stBear && cloudBear) {
        strength = strength * 0.5;
        rationale += " · ST + Ichimoku contradict (bearish)";
      } else if (stBear || cloudBear) {
        strength = strength * 0.8;
        rationale += " · ST/Ichimoku mixed";
      }
    } else if (direction === "bearish") {
      if (stBear && cloudBear) {
        strength = Math.min(1, strength + 0.2);
        rationale += " · ST + Ichimoku confirm bearish";
      } else if (stBull && cloudBull) {
        strength = strength * 0.5;
        rationale += " · ST + Ichimoku contradict (bullish)";
      } else if (stBull || cloudBull) {
        strength = strength * 0.8;
        rationale += " · ST/Ichimoku mixed";
      }
    } else {
      if (stBull && cloudBull) {
        direction = "bullish";
        strength = 0.4;
        rationale = "EMA flat nhưng ST + Ichimoku đồng thuận bullish";
      } else if (stBear && cloudBear) {
        direction = "bearish";
        strength = 0.4;
        rationale = "EMA flat nhưng ST + Ichimoku đồng thuận bearish";
      }
    }
  }

  return { direction, strength, rationale };
}

export function snapshotIndicators(data: Bar[]): IndicatorSnapshot {
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

  const stSeries = superTrend(data);
  const lastST = stSeries.length > 0 ? stSeries[stSeries.length - 1] : null;

  const ichiSeries = ichimoku(data);
  const lastIchi = ichiSeries.length > 0 ? ichiSeries[ichiSeries.length - 1] : null;
  const prevIchi = ichiSeries.length > 1 ? ichiSeries[ichiSeries.length - 2] : null;

  const lastClose = data.length > 0 ? data[data.length - 1].close : null;
  let priceVsCloud: "above" | "below" | "inside" | null = null;
  if (lastClose !== null && lastIchi && lastIchi.cloudTop !== null && lastIchi.cloudBottom !== null) {
    if (lastClose > lastIchi.cloudTop) priceVsCloud = "above";
    else if (lastClose < lastIchi.cloudBottom) priceVsCloud = "below";
    else priceVsCloud = "inside";
  }

  let tkCross: "bullish" | "bearish" | "none" = "none";
  if (lastIchi && prevIchi && lastIchi.tenkanSen !== null && lastIchi.kijunSen !== null && prevIchi.tenkanSen !== null && prevIchi.kijunSen !== null) {
    if (lastIchi.tenkanSen > lastIchi.kijunSen && prevIchi.tenkanSen <= prevIchi.kijunSen) tkCross = "bullish";
    else if (lastIchi.tenkanSen < lastIchi.kijunSen && prevIchi.tenkanSen >= prevIchi.kijunSen) tkCross = "bearish";
  }

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
    superTrend: {
      value: lastST ? lastST.superTrend : null,
      direction: lastST ? lastST.direction : null,
    },
    ichimoku: {
      tenkanSen: lastIchi ? lastIchi.tenkanSen : null,
      kijunSen: lastIchi ? lastIchi.kijunSen : null,
      cloudTop: lastIchi ? lastIchi.cloudTop : null,
      cloudBottom: lastIchi ? lastIchi.cloudBottom : null,
      priceVsCloud,
      tkCross,
    },
  };
}

export function classifyVolume(data: Bar[]): VolumeInfo {
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
    // Constant historical volume, fall back to ratio comparison
    zscore = mean > 0 ? (today - mean) / mean : 0;
    if (mean === 0) signal = "normal";
    else if (today >= mean * 2) signal = "above_average";
    else if (today <= mean * 0.5) signal = "below_average";
    else signal = "normal";
  }
  return { today, avg20: mean, signal, zscore };
}

export function computePerformance(data: Bar[]): PerformanceInfo {
  if (data.length === 0) return { change1d: null, change7d: null, change30d: null, change90d: null };
  const last = data[data.length - 1].close;
  function chg(daysBack: number): number | null {
    const idx = data.length - 1 - daysBack;
    if (idx < 0) return null;
    const ref = data[idx].close;
    return ref > 0 ? Math.round(((last - ref) / ref) * 100 * 1000) / 1000 : null;
  }
  return { change1d: chg(1), change7d: chg(7), change30d: chg(30), change90d: chg(90) };
}

/**
 * Plain-text context for an LLM prompt. `price` formats every price-valued number (MAs, bands,
 * ATR, levels); without it they print with fixed decimals as in v1.
 */
export function formatAIPrompt(ctx: AIContext, lang: "vi" | "en" = "vi", price?: (v: number) => string): string {
  const p = (v: number | null | undefined, digits: number): string => (v === null || v === undefined ? "n/a" : price ? price(v) : v.toFixed(digits));
  const lines: string[] = [];
  if (lang === "vi") {
    lines.push(`=== ${ctx.symbol} · ${ctx.asOf} ===`);
    lines.push(`Trend: ${ctx.trend.direction} (strength ${(ctx.trend.strength * 100).toFixed(0)}%): ${ctx.trend.rationale}`);
    const ind = ctx.indicators;
    lines.push(`RSI(14): ${ind.rsi14?.toFixed(1) ?? "n/a"}`);
    lines.push(`MACD: line ${p(ind.macd.line, 3)}, signal ${p(ind.macd.signal, 3)}, histogram ${p(ind.macd.histogram, 3)}, crossover: ${ind.macd.crossover}`);
    lines.push(`SMA: 20=${p(ind.sma[20], 2)}, 50=${p(ind.sma[50], 2)}, 200=${p(ind.sma[200], 2)}`);
    lines.push(`EMA: 20=${p(ind.ema[20], 2)}, 50=${p(ind.ema[50], 2)}, 200=${p(ind.ema[200], 2)}`);
    lines.push(`Bollinger %B: ${ind.bollinger.percentB?.toFixed(2) ?? "n/a"} (upper=${p(ind.bollinger.upper, 2)}, lower=${p(ind.bollinger.lower, 2)})`);
    lines.push(`ATR(14): ${p(ind.atr14, 3)}`);
    const stVi = ind.superTrend;
    const stArrowVi = stVi.direction === "bullish" ? "▲ TĂNG" : stVi.direction === "bearish" ? "▼ GIẢM" : "n/a";
    lines.push(`SuperTrend: ${p(stVi.value, 2)} (${stArrowVi})`);
    const ichiVi = ind.ichimoku;
    const cloudStrVi = ichiVi.cloudBottom !== null && ichiVi.cloudTop !== null ? `[${p(ichiVi.cloudBottom, 2)} – ${p(ichiVi.cloudTop, 2)}]` : "n/a";
    const priceVsVi =
      ichiVi.priceVsCloud === "above" ? "TRÊN mây" : ichiVi.priceVsCloud === "below" ? "DƯỚI mây" : ichiVi.priceVsCloud === "inside" ? "TRONG mây" : "n/a";
    lines.push(`Ichimoku: TK ${p(ichiVi.tenkanSen, 2)} / KJ ${p(ichiVi.kijunSen, 2)} · Cloud ${cloudStrVi} · Giá ${priceVsVi} · TK cross: ${ichiVi.tkCross}`);
    lines.push(
      `Volume: ${ctx.volume.today.toLocaleString()} (avg ${ctx.volume.avg20.toLocaleString()}, z-score ${ctx.volume.zscore.toFixed(2)}, ${ctx.volume.signal})`
    );
    lines.push(`Support: ${ctx.levels.support.map((v) => p(v, 2)).join(" / ") || "n/a"}`);
    lines.push(`Resistance: ${ctx.levels.resistance.map((v) => p(v, 2)).join(" / ") || "n/a"}`);
    const perf = ctx.performance;
    const fmtPct = (v: number | null) => (v === null ? "n/a" : (v >= 0 ? "+" : "") + v.toFixed(2) + "%");
    lines.push(`Change: 1d ${fmtPct(perf.change1d)} · 7d ${fmtPct(perf.change7d)} · 30d ${fmtPct(perf.change30d)} · 90d ${fmtPct(perf.change90d)}`);
  } else {
    lines.push(`=== ${ctx.symbol} · ${ctx.asOf} ===`);
    lines.push(`Trend: ${ctx.trend.direction} (strength ${(ctx.trend.strength * 100).toFixed(0)}%): ${ctx.trend.rationale}`);
    const ind = ctx.indicators;
    lines.push(`RSI(14): ${ind.rsi14?.toFixed(1) ?? "n/a"}`);
    lines.push(`MACD: line ${p(ind.macd.line, 3)}, signal ${p(ind.macd.signal, 3)}, crossover: ${ind.macd.crossover}`);
    lines.push(`SMA: 20=${p(ind.sma[20], 2)}, 50=${p(ind.sma[50], 2)}, 200=${p(ind.sma[200], 2)}`);
    lines.push(`Bollinger %B: ${ind.bollinger.percentB?.toFixed(2) ?? "n/a"}`);
    lines.push(`ATR(14): ${p(ind.atr14, 3)}`);
    const stEn = ind.superTrend;
    lines.push(`SuperTrend: ${p(stEn.value, 2)} (${stEn.direction ?? "n/a"})`);
    const ichiEn = ind.ichimoku;
    const cloudStrEn = ichiEn.cloudBottom !== null && ichiEn.cloudTop !== null ? `[${p(ichiEn.cloudBottom, 2)} – ${p(ichiEn.cloudTop, 2)}]` : "n/a";
    lines.push(
      `Ichimoku: TK ${p(ichiEn.tenkanSen, 2)} / KJ ${p(ichiEn.kijunSen, 2)} · Cloud ${cloudStrEn} · Price ${ichiEn.priceVsCloud ?? "n/a"} cloud · TK cross: ${ichiEn.tkCross}`
    );
    lines.push(`Volume: ${ctx.volume.today} (z-score ${ctx.volume.zscore.toFixed(2)}, ${ctx.volume.signal})`);
    lines.push(`Support: ${ctx.levels.support.map((v) => p(v, 2)).join(" / ") || "n/a"}`);
    lines.push(`Resistance: ${ctx.levels.resistance.map((v) => p(v, 2)).join(" / ") || "n/a"}`);
    const perf = ctx.performance;
    const fmtPct = (v: number | null) => (v === null ? "n/a" : (v >= 0 ? "+" : "") + v.toFixed(2) + "%");
    lines.push(`Change: 1d ${fmtPct(perf.change1d)} · 7d ${fmtPct(perf.change7d)} · 30d ${fmtPct(perf.change30d)} · 90d ${fmtPct(perf.change90d)}`);
  }
  return lines.join("\n");
}
