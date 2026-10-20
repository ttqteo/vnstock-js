import { Bar } from "../types";
import { InvalidParameterError } from "../errors";
import { volumeZScore } from "./volume-zscore";

export interface Breakout {
  time: string;
  direction: "up" | "down";
  /** The highest high (up) or lowest low (down) of the previous `lookback` bars. */
  level: number;
  /** Volume z-score of the breakout bar against the same window. */
  volumeZ: number;
}

export interface BreakoutOptions {
  /** Number of earlier bars that set the level. Default 20. */
  lookback?: number;
  /** Minimum volume z-score of the breakout bar. Default 2. */
  volumeZ?: number;
}

/**
 * Close beyond the highest high / lowest low of the previous `lookback` bars on volume z >= volumeZ.
 * @example
 * breakouts(bars, { lookback: 20, volumeZ: 2 }).filter((b) => b.direction === "up")
 */
export function breakouts(bars: Bar[], options: BreakoutOptions = {}): Breakout[] {
  const lookback = options.lookback ?? 20;
  const minZ = options.volumeZ ?? 2;
  if (!(lookback >= 2)) throw new InvalidParameterError("lookback", lookback, undefined, "lookback is a window in sessions, at least 2 (default 20).");
  if (!Number.isFinite(minZ)) throw new InvalidParameterError("volumeZ", minZ, undefined, "volumeZ is a z-score threshold such as 2.");

  const z = volumeZScore(bars, { period: lookback });
  const out: Breakout[] = [];
  for (let i = lookback; i < bars.length; i++) {
    const vz = z[i].z;
    if (vz === null || vz < minZ) continue;
    let hi = -Infinity;
    let lo = Infinity;
    for (let j = i - lookback; j < i; j++) {
      if (bars[j].high > hi) hi = bars[j].high;
      if (bars[j].low < lo) lo = bars[j].low;
    }
    const close = bars[i].close;
    if (close > hi) out.push({ time: bars[i].time, direction: "up", level: hi, volumeZ: vz });
    else if (close < lo) out.push({ time: bars[i].time, direction: "down", level: lo, volumeZ: vz });
  }
  return out;
}
