import { Bar, Quote } from "../../types";
import { Exchange, MarketBreadth, MarketRegime } from "../../models/market";
import { sma } from "../../indicators/sma";

/** Ratios of ~1500 counts otherwise surface as 1.2999999999999998. */
function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * A symbol with no matched price has not traded, so it is neither up nor down.
 * Counting it as unchanged would inflate the flat bucket with dead listings.
 */
function hasTraded(q: Quote): boolean {
  return q.price > 0 && q.ref > 0;
}

/** Advancers, decliners, unchanged, ceiling and floor counts of a board. */
export function computeBreadth(quotes: Quote[], exchange: Exchange | "ALL", date: string): MarketBreadth {
  let advancing = 0;
  let declining = 0;
  let unchanged = 0;
  let ceiling = 0;
  let floor = 0;
  let total = 0;

  for (const q of quotes) {
    if (!hasTraded(q)) continue;
    total++;
    if (q.price > q.ref) advancing++;
    else if (q.price < q.ref) declining++;
    else unchanged++;
    if (q.ceiling > 0 && q.price === q.ceiling) ceiling++;
    if (q.floor > 0 && q.price === q.floor) floor++;
  }

  return {
    exchange,
    date,
    advancing,
    declining,
    unchanged,
    ceiling,
    floor,
    total,
    advanceDeclineRatio: declining > 0 ? round3(advancing / declining) : null,
  };
}

/**
 * Deliberately the same shape of rule as the per-symbol trend classifier: price
 * against SMA20 and SMA50. An index has no volume-confirmation story worth
 * modelling separately, so keep it simple and explainable.
 */
export function classifyRegime(bars: Bar[]): { regime: MarketRegime; rationale: string } {
  if (bars.length < 50) {
    return { regime: "sideways", rationale: "Not enough history to classify (need 50 bars)" };
  }

  const sma20 = sma(bars, { period: 20 });
  const sma50 = sma(bars, { period: 50 });
  const last = bars[bars.length - 1].close;
  const s20 = sma20[sma20.length - 1].sma;
  const s50 = sma50[sma50.length - 1].sma;

  if (s20 === null || s50 === null) {
    return { regime: "sideways", rationale: "Moving averages unavailable" };
  }
  if (last > s20 && s20 > s50) {
    return { regime: "trending_up", rationale: `Close ${last.toFixed(2)} above SMA20 ${s20.toFixed(2)} above SMA50 ${s50.toFixed(2)}` };
  }
  if (last < s20 && s20 < s50) {
    return { regime: "trending_down", rationale: `Close ${last.toFixed(2)} below SMA20 ${s20.toFixed(2)} below SMA50 ${s50.toFixed(2)}` };
  }
  return { regime: "sideways", rationale: `Close ${last.toFixed(2)} mixed against SMA20 ${s20.toFixed(2)} and SMA50 ${s50.toFixed(2)}` };
}

/** Heavier or lighter than the 20-session norm, by 20%. */
export function liquiditySignal(value: number, avg20: number): "above_average" | "below_average" | "normal" {
  if (avg20 === 0) return "normal";
  const ratio = value / avg20;
  if (ratio >= 1.2) return "above_average";
  if (ratio <= 0.8) return "below_average";
  return "normal";
}
