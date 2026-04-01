import { QuoteHistory } from "../models/normalized";

export interface EmaResult {
  date: string;
  ema: number | null;
}

export function ema(
  data: QuoteHistory[],
  options: { period: number; field?: keyof QuoteHistory }
): EmaResult[] {
  const { period, field = "close" } = options;

  if (period < 1) throw new Error("Period must be >= 1");
  if (data.length === 0) return [];

  const multiplier = 2 / (period + 1);
  const results: EmaResult[] = [];

  let prevEma: number | null = null;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      results.push({ date: data[i].date, ema: null });
    } else if (i === period - 1) {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[j][field] as number;
      }
      prevEma = sum / period;
      results.push({ date: data[i].date, ema: prevEma });
    } else {
      if (prevEma === null) {
        results.push({ date: data[i].date, ema: null });
      } else {
        const value = data[i][field] as number;
        prevEma = value * multiplier + prevEma * (1 - multiplier);
        results.push({ date: data[i].date, ema: prevEma });
      }
    }
  }

  return results;
}
