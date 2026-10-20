import { Bar } from "../types";

export interface Pivot {
  index: number;
  time: string;
  price: number;
  kind: "high" | "low";
}

/**
 * Swing pivots: bars whose high (low) is strictly above (below) every other bar
 * within `window` bars on each side. Shared by support/resistance and zone detection.
 *
 * @example
 * swingPivots(bars, 5) // [{ index: 12, time: "2026-01-13", price: 101.5, kind: "high" }, ...]
 */
export function swingPivots(bars: Bar[], window: number): Pivot[] {
  const out: Pivot[] = [];
  for (let i = window; i < bars.length - window; i++) {
    let isHigh = true;
    let isLow = true;
    for (let j = i - window; j <= i + window; j++) {
      if (j === i) continue;
      if (bars[j].high >= bars[i].high) isHigh = false;
      if (bars[j].low <= bars[i].low) isLow = false;
      if (!isHigh && !isLow) break;
    }
    if (isHigh) out.push({ index: i, time: bars[i].time, price: bars[i].high, kind: "high" });
    if (isLow) out.push({ index: i, time: bars[i].time, price: bars[i].low, kind: "low" });
  }
  return out;
}
