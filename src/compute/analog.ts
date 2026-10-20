import { Bar } from "../types";
import { InvalidParameterError } from "../errors";
import { rsi } from "../indicators/rsi";
import { macd } from "../indicators/macd";
import { ema } from "../indicators/ema";
import { volumeZScore } from "../indicators/volume-zscore";
import { pctChange } from "./backtest";

/** The five readings compared between sessions. */
export interface Fingerprint {
  /** RSI 14, 0 to 100. */
  rsi: number;
  /** MACD histogram divided by the close. */
  macdHist: number;
  /** Volume z-score against the previous 20 sessions, clamped to -5..5. */
  volumeZ: number;
  /** EMA 20 change over 5 sessions, as a fraction. */
  emaSlope: number;
  /** Close against the highest high of the last 250 sessions, as a fraction (0 at the high). */
  fromHigh: number;
}

export interface SimilarMatch {
  time: string;
  /** Cosine similarity of the standardised fingerprints, -1 to 1. */
  similarity: number;
  close: number;
  /** Percent change of the close 5, 20 and 60 sessions later; null when not that many sessions have passed. */
  ret5: number | null;
  ret20: number | null;
  ret60: number | null;
}

export interface ForwardStats {
  /** Matches with this return known. */
  count: number;
  /** Percent. */
  avg: number | null;
  /** Share of positive returns, as a fraction. */
  winRate: number | null;
}

export interface SimilarResult {
  symbol: string;
  /** The session compared against history. */
  asOf: string;
  fingerprint: Fingerprint;
  matches: SimilarMatch[];
  summary: { ret5: ForwardStats; ret20: ForwardStats; ret60: ForwardStats };
}

export interface SimilarOptions {
  /** Matches returned, 1 to 50. Default 10. */
  top?: number;
}

const HIGH_WINDOW = 250;
// Sessions next to today look alike only because they overlap it.
const EXCLUDE_RECENT = 20;
const HORIZONS = [5, 20, 60] as const;

/** Rounds to 3 decimals; not a unit change. */
function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Fingerprint of every session, null until a year of sessions and every indicator exist. */
function fingerprints(bars: Bar[]): (Fingerprint | null)[] {
  const r = rsi(bars, { period: 14 });
  const m = macd(bars);
  const e = ema(bars, { period: 20 });
  const z = volumeZScore(bars, { period: 20 });
  return bars.map((b, i) => {
    if (i < HIGH_WINDOW - 1 || b.close <= 0) return null;
    const rv = r[i].rsi;
    const hv = m[i].histogram;
    const zv = z[i].z;
    const e0 = e[i - 5].ema;
    const e1 = e[i].ema;
    if (rv === null || hv === null || zv === null || e0 === null || e1 === null || e0 === 0) return null;
    let high = 0;
    for (let k = i - HIGH_WINDOW + 1; k <= i; k++) high = Math.max(high, bars[k].high);
    return {
      rsi: rv,
      macdHist: hv / b.close,
      volumeZ: Math.max(-5, Math.min(5, zv)),
      emaSlope: e1 / e0 - 1,
      fromHigh: high > 0 ? b.close / high - 1 : 0,
    };
  });
}

function vector(f: Fingerprint): number[] {
  return [f.rsi, f.macdHist, f.volumeZ, f.emaSlope, f.fromHigh];
}

function forward(matches: SimilarMatch[], key: "ret5" | "ret20" | "ret60"): ForwardStats {
  const rets = matches.map((x) => x[key]).filter((v): v is number => v !== null);
  const n = rets.length;
  return {
    count: n,
    avg: n ? round3(rets.reduce((a, v) => a + v, 0) / n) : null,
    winRate: n ? round3(rets.filter((v) => v > 0).length / n) : null,
  };
}

/**
 * Past sessions whose setup looks like the last one, and what the price did 5, 20 and 60
 * sessions later. Each reading is standardised over the symbol's own history before a cosine
 * comparison. Experimental: similar setups do not imply similar outcomes.
 * @experimental
 * @example
 * findSimilar("FPT", bars, { top: 10 }).summary.ret20.avg
 */
export function findSimilar(symbol: string, bars: Bar[], options: SimilarOptions = {}): SimilarResult {
  const top = options.top ?? 10;
  if (!(Number.isInteger(top) && top >= 1 && top <= 50))
    throw new InvalidParameterError("top", top, undefined, "top is a whole number from 1 to 50 (default 10).");
  const prints = fingerprints(bars);
  const last = bars.length - 1;
  const today = last >= 0 ? prints[last] : null;
  if (!today) {
    throw new InvalidParameterError("bars", bars.length, undefined, "similar() needs at least " + HIGH_WINDOW + " sessions of daily bars; use range '5y'.");
  }

  const valid = prints.map((p, i) => [p, i] as [Fingerprint | null, number]).filter((x): x is [Fingerprint, number] => x[0] !== null);
  const dims = vector(today).length;
  const mean: number[] = [];
  const sd: number[] = [];
  for (let d = 0; d < dims; d++) {
    const xs = valid.map(([p]) => vector(p)[d]);
    const mu = xs.reduce((a, v) => a + v, 0) / xs.length;
    mean.push(mu);
    sd.push(Math.sqrt(xs.reduce((a, v) => a + (v - mu) * (v - mu), 0) / xs.length));
  }
  const standard = (f: Fingerprint) => vector(f).map((v, d) => (sd[d] > 0 ? (v - mean[d]) / sd[d] : 0));
  const norm = (v: number[]) => Math.sqrt(v.reduce((a, x) => a + x * x, 0));
  const t = standard(today);
  const tn = norm(t);

  const scored: { i: number; similarity: number }[] = [];
  for (const [p, i] of valid) {
    if (i > last - EXCLUDE_RECENT) continue;
    const v = standard(p);
    const vn = norm(v);
    const similarity = tn > 0 && vn > 0 ? v.reduce((a, x, d) => a + x * t[d], 0) / (tn * vn) : 0;
    scored.push({ i, similarity });
  }
  scored.sort((a, b) => b.similarity - a.similarity);

  const matches: SimilarMatch[] = scored.slice(0, top).map(({ i, similarity }) => {
    const [r5, r20, r60] = HORIZONS.map((h) => (i + h <= last ? pctChange(bars[i].close, bars[i + h].close) : null));
    return { time: bars[i].time, similarity: round3(similarity), close: bars[i].close, ret5: r5, ret20: r20, ret60: r60 };
  });

  return {
    symbol,
    asOf: bars[last].time,
    fingerprint: {
      rsi: round3(today.rsi),
      macdHist: round3(today.macdHist * 1000) / 1000,
      volumeZ: round3(today.volumeZ),
      emaSlope: round3(today.emaSlope * 1000) / 1000,
      fromHigh: round3(today.fromHigh),
    },
    matches,
    summary: { ret5: forward(matches, "ret5"), ret20: forward(matches, "ret20"), ret60: forward(matches, "ret60") },
  };
}
