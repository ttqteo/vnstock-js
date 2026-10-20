import { Bar } from "../types";

export interface RsiResult {
  time: string;
  rsi: number | null;
}

/**
 * Wilder's RSI, 14 periods by default; 0 to 100.
 * @example
 * rsi(bars).at(-1)?.rsi // 62.4
 */
export function rsi(data: Bar[], options: { period?: number; field?: "open" | "high" | "low" | "close" | "volume" } = {}): RsiResult[] {
  const { period = 14, field = "close" } = options;

  if (period < 1) throw new Error("Period must be >= 1");
  if (data.length === 0) return [];

  const results: RsiResult[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      gains.push(0);
      losses.push(0);
    } else {
      const change = (data[i][field] as number) - (data[i - 1][field] as number);
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
  }

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      results.push({ time: data[i].time, rsi: null });
    } else if (i === period) {
      let sumGain = 0;
      let sumLoss = 0;
      for (let j = 1; j <= period; j++) {
        sumGain += gains[j];
        sumLoss += losses[j];
      }
      avgGain = sumGain / period;
      avgLoss = sumLoss / period;

      if (avgLoss === 0) {
        results.push({ time: data[i].time, rsi: 100 });
      } else {
        const rs = avgGain / avgLoss;
        results.push({ time: data[i].time, rsi: 100 - 100 / (1 + rs) });
      }
    } else {
      avgGain = (avgGain * (period - 1) + gains[i]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

      if (avgLoss === 0) {
        results.push({ time: data[i].time, rsi: 100 });
      } else {
        const rs = avgGain / avgLoss;
        results.push({ time: data[i].time, rsi: 100 - 100 / (1 + rs) });
      }
    }
  }

  return results;
}
