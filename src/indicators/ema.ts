import { Bar } from "../types";

export interface EmaResult {
  time: string;
  ema: number | null;
}

/**
 * Exponential moving average seeded with the SMA of the first `period` bars.
 * @example
 * ema(bars, { period: 50 }).at(-1)?.ema
 */
export function ema(data: Bar[], options: { period: number; field?: "open" | "high" | "low" | "close" | "volume" }): EmaResult[] {
  const { period, field = "close" } = options;

  if (period < 1) throw new Error("Period must be >= 1");
  if (data.length === 0) return [];

  const multiplier = 2 / (period + 1);
  const results: EmaResult[] = [];

  let prevEma: number | null = null;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      results.push({ time: data[i].time, ema: null });
    } else if (i === period - 1) {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[j][field] as number;
      }
      prevEma = sum / period;
      results.push({ time: data[i].time, ema: prevEma });
    } else {
      if (prevEma === null) {
        results.push({ time: data[i].time, ema: null });
      } else {
        const value = data[i][field] as number;
        prevEma = value * multiplier + prevEma * (1 - multiplier);
        results.push({ time: data[i].time, ema: prevEma });
      }
    }
  }

  return results;
}
