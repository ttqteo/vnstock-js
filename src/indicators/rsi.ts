import { QuoteHistory } from "../models/normalized";

export interface RsiResult {
  date: string;
  rsi: number | null;
}

export function rsi(
  data: QuoteHistory[],
  options: { period: number; field?: keyof QuoteHistory } = { period: 14 }
): RsiResult[] {
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
      results.push({ date: data[i].date, rsi: null });
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
        results.push({ date: data[i].date, rsi: 100 });
      } else {
        const rs = avgGain / avgLoss;
        results.push({ date: data[i].date, rsi: 100 - 100 / (1 + rs) });
      }
    } else {
      avgGain = (avgGain * (period - 1) + gains[i]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

      if (avgLoss === 0) {
        results.push({ date: data[i].date, rsi: 100 });
      } else {
        const rs = avgGain / avgLoss;
        results.push({ date: data[i].date, rsi: 100 - 100 / (1 + rs) });
      }
    }
  }

  return results;
}
