import { QuoteHistory } from "../../models/normalized";

export interface PivotLevels {
  support: number[];
  resistance: number[];
}

export function detectPivots(
  data: QuoteHistory[],
  options: { window?: number; topN?: number } = {}
): PivotLevels {
  const window = options.window ?? 5;
  const topN = options.topN ?? 3;

  if (data.length < window * 2 + 1) {
    return { support: [], resistance: [] };
  }

  const swingHighs: { date: string; value: number }[] = [];
  const swingLows: { date: string; value: number }[] = [];

  for (let i = window; i < data.length - window; i++) {
    const cur = data[i];
    let isHigh = true;
    let isLow = true;
    for (let j = i - window; j <= i + window; j++) {
      if (j === i) continue;
      if (data[j].high >= cur.high) isHigh = false;
      if (data[j].low <= cur.low) isLow = false;
      if (!isHigh && !isLow) break;
    }
    if (isHigh) swingHighs.push({ date: cur.date, value: cur.high });
    if (isLow) swingLows.push({ date: cur.date, value: cur.low });
  }

  const lastClose = data[data.length - 1].close;

  const resistance = swingHighs
    .filter((p) => p.value > lastClose)
    .sort((a, b) => a.value - b.value)
    .slice(0, topN)
    .map((p) => p.value);

  const support = swingLows
    .filter((p) => p.value < lastClose)
    .sort((a, b) => b.value - a.value)
    .slice(0, topN)
    .map((p) => p.value);

  return { support, resistance };
}
