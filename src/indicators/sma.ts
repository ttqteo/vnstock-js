import { Bar } from "../types";

export interface SmaResult {
  time: string;
  sma: number | null;
}

/**
 * Simple moving average of `field` (close by default); null until `period` bars exist.
 * @example
 * sma(bars, { period: 20 }).at(-1)?.sma
 */
export function sma(data: Bar[], options: { period: number; field?: "open" | "high" | "low" | "close" | "volume" }): SmaResult[] {
  const { period, field = "close" } = options;

  if (period < 1) throw new Error("Period must be >= 1");
  if (data.length === 0) return [];

  const results: SmaResult[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      results.push({ time: data[i].time, sma: null });
    } else {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        sum += data[j][field] as number;
      }
      results.push({ time: data[i].time, sma: sum / period });
    }
  }

  return results;
}
