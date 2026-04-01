import { QuoteHistory } from "../models/normalized";

export interface SmaResult {
  date: string;
  sma: number | null;
}

export function sma(
  data: QuoteHistory[],
  options: { period: number; field?: keyof QuoteHistory }
): SmaResult[] {
  const { period, field = "close" } = options;

  if (period < 1) throw new Error("Period must be >= 1");
  if (data.length === 0) return [];

  const results: SmaResult[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      results.push({ date: data[i].date, sma: null });
    } else {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        sum += data[j][field] as number;
      }
      results.push({ date: data[i].date, sma: sum / period });
    }
  }

  return results;
}
