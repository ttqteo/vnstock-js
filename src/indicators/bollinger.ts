import { Bar } from "../types";

export interface BollingerResult {
  time: string;
  upper: number | null;
  middle: number | null;
  lower: number | null;
  percentB: number | null;
}

/**
 * Bollinger bands and %B; defaults 20 periods, 2 standard deviations.
 * @example
 * bollinger(bars, { period: 20, stddev: 2 }).at(-1)?.percentB
 */
export function bollinger(
  data: Bar[],
  options: { period?: number; stddev?: number; field?: "open" | "high" | "low" | "close" | "volume" } = {}
): BollingerResult[] {
  const period = options.period ?? 20;
  const stddevMul = options.stddev ?? 2;
  const field = options.field ?? "close";

  if (period < 1) throw new Error("Period must be >= 1");
  if (data.length === 0) return [];

  const results: BollingerResult[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      results.push({ time: data[i].time, upper: null, middle: null, lower: null, percentB: null });
      continue;
    }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += data[j][field] as number;
    const mean = sum / period;

    let variance = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const v = data[j][field] as number;
      variance += (v - mean) * (v - mean);
    }
    const sd = Math.sqrt(variance / period);

    const upper = mean + stddevMul * sd;
    const lower = mean - stddevMul * sd;
    const value = data[i][field] as number;
    const range = upper - lower;
    const percentB = range > 0 ? (value - lower) / range : 0;

    results.push({ time: data[i].time, upper, middle: mean, lower, percentB });
  }

  return results;
}
