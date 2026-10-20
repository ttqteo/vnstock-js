import { Bar } from "../../types";
import { swingPivots } from "../../indicators/pivots";

export interface PivotLevels {
  support: number[];
  resistance: number[];
}

export function detectPivots(data: Bar[], options: { window?: number; topN?: number } = {}): PivotLevels {
  const window = options.window ?? 5;
  const topN = options.topN ?? 3;

  if (data.length < window * 2 + 1) {
    return { support: [], resistance: [] };
  }

  const pivots = swingPivots(data, window);
  const swingHighs = pivots.filter((p) => p.kind === "high");
  const swingLows = pivots.filter((p) => p.kind === "low");

  const lastClose = data[data.length - 1].close;

  const resistance = swingHighs
    .filter((p) => p.price > lastClose)
    .sort((a, b) => a.price - b.price)
    .slice(0, topN)
    .map((p) => p.price);

  const support = swingLows
    .filter((p) => p.price < lastClose)
    .sort((a, b) => b.price - a.price)
    .slice(0, topN)
    .map((p) => p.price);

  return { support, resistance };
}
