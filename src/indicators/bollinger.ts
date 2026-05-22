import { QuoteHistory } from "../models/normalized";

export interface BollingerResult {
  date: string;
  upper: number | null;
  middle: number | null;
  lower: number | null;
  percentB: number | null;
}

export function bollinger(
  data: QuoteHistory[],
  options: { period?: number; stddev?: number; field?: keyof QuoteHistory } = {}
): BollingerResult[] {
  const period = options.period ?? 20;
  const stddevMul = options.stddev ?? 2;
  const field = options.field ?? "close";

  if (period < 1) throw new Error("Period must be >= 1");
  if (data.length === 0) return [];

  const results: BollingerResult[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      results.push({ date: data[i].date, upper: null, middle: null, lower: null, percentB: null });
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

    results.push({ date: data[i].date, upper, middle: mean, lower, percentB });
  }

  return results;
}
