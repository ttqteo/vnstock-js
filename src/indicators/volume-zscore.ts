import { Bar } from "../types";
import { InvalidParameterError } from "../errors";

export interface VolumeZPoint {
  time: string;
  /** Null until `period` earlier bars exist. */
  z: number | null;
}

export interface VolumeZScoreOptions {
  /** Number of earlier bars the current volume is compared with. Default 20. */
  period?: number;
}

/**
 * Volume in standard deviations from the mean of the previous `period` bars (current bar excluded).
 * Uses the population standard deviation; a window with no spread gives z = 0.
 * @example
 * volumeZScore(bars, { period: 20 }).filter((p) => (p.z ?? 0) >= 2)
 */
export function volumeZScore(bars: Bar[], options: VolumeZScoreOptions = {}): VolumeZPoint[] {
  const period = options.period ?? 20;
  if (!(period >= 2)) throw new InvalidParameterError("period", period, undefined, "period is a window in sessions, at least 2 (default 20).");

  // Two passes per window instead of running sums: volumes reach 1e8, where sums of squares lose precision.
  const out: VolumeZPoint[] = [];
  for (let i = 0; i < bars.length; i++) {
    let z: number | null = null;
    if (i >= period) {
      let sum = 0;
      for (let j = i - period; j < i; j++) sum += bars[j].volume;
      const mean = sum / period;
      let sq = 0;
      for (let j = i - period; j < i; j++) sq += (bars[j].volume - mean) ** 2;
      const sd = Math.sqrt(sq / period);
      z = sd === 0 ? 0 : (bars[i].volume - mean) / sd;
    }
    out.push({ time: bars[i].time, z });
  }
  return out;
}
