import { QuoteHistory } from "../models/normalized";

export interface MacdResult {
  date: string;
  macd: number | null;
  signal: number | null;
  histogram: number | null;
}

function emaSeries(values: number[], period: number): (number | null)[] {
  if (period < 1) throw new Error("Period must be >= 1");
  const out: (number | null)[] = [];
  const multiplier = 2 / (period + 1);
  let prev: number | null = null;
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      out.push(null);
    } else if (i === period - 1) {
      let sum = 0;
      for (let j = 0; j < period; j++) sum += values[j];
      prev = sum / period;
      out.push(prev);
    } else {
      const v = values[i];
      prev = v * multiplier + (prev as number) * (1 - multiplier);
      out.push(prev);
    }
  }
  return out;
}

export function macd(
  data: QuoteHistory[],
  options: { fast?: number; slow?: number; signal?: number; field?: keyof QuoteHistory } = {}
): MacdResult[] {
  const fast = options.fast ?? 12;
  const slow = options.slow ?? 26;
  const signalPeriod = options.signal ?? 9;
  const field = options.field ?? "close";

  if (fast < 1 || slow < 1 || signalPeriod < 1) throw new Error("Periods must be >= 1");
  if (fast >= slow) throw new Error("Fast period must be < slow period");
  if (data.length === 0) return [];

  const values = data.map((c) => c[field] as number);
  const fastEma = emaSeries(values, fast);
  const slowEma = emaSeries(values, slow);

  const macdLine: (number | null)[] = values.map((_, i) => {
    const f = fastEma[i];
    const s = slowEma[i];
    return f !== null && s !== null ? f - s : null;
  });

  const macdValid = macdLine.map((v) => (v === null ? 0 : v));
  const firstValid = macdLine.findIndex((v) => v !== null);
  const signalLine: (number | null)[] = values.map(() => null);
  if (firstValid >= 0) {
    const slice = macdValid.slice(firstValid);
    const sig = emaSeries(slice, signalPeriod);
    for (let i = 0; i < sig.length; i++) signalLine[firstValid + i] = sig[i];
  }

  return data.map((c, i) => ({
    date: c.date,
    macd: macdLine[i],
    signal: signalLine[i],
    histogram:
      macdLine[i] !== null && signalLine[i] !== null
        ? (macdLine[i] as number) - (signalLine[i] as number)
        : null,
  }));
}
