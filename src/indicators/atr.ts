import { Bar } from "../types";

export interface AtrResult {
  time: string;
  atr: number | null;
}

/**
 * Average true range with Wilder smoothing, in the bars' price unit (dong for stocks).
 * @example
 * atr(bars, 14).at(-1)?.atr
 */
export function atr(data: Bar[], period: number = 14): AtrResult[] {
  if (period < 1) throw new Error("Period must be >= 1");
  if (data.length === 0) return [];

  const trs: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const cur = data[i];
    if (i === 0) {
      trs.push(cur.high - cur.low);
    } else {
      const prev = data[i - 1];
      const tr = Math.max(cur.high - cur.low, Math.abs(cur.high - prev.close), Math.abs(cur.low - prev.close));
      trs.push(tr);
    }
  }

  const results: AtrResult[] = [];
  let prevAtr: number | null = null;
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      results.push({ time: data[i].time, atr: null });
    } else if (i === period - 1) {
      let sum = 0;
      for (let j = 0; j < period; j++) sum += trs[j];
      prevAtr = sum / period;
      results.push({ time: data[i].time, atr: prevAtr });
    } else {
      prevAtr = ((prevAtr as number) * (period - 1) + trs[i]) / period;
      results.push({ time: data[i].time, atr: prevAtr });
    }
  }

  return results;
}
