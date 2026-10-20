import { Bar } from "../types";
import { supportResistance, PriceZone } from "./zones";
import { extremeZones } from "./extremes";
import { candlePatterns, CandlePatternHit } from "./patterns";
import { turtleSignals, TurtleSignal } from "./turtle";
import { breakouts, Breakout } from "./breakout";

export interface PatternReport {
  zones: PriceZone[];
  /** Extreme zone of the last bar. */
  extreme: "bottom" | "top" | null;
  /** Candle patterns completed in the last `recent` bars, newest first. */
  candles: CandlePatternHit[];
  /** Latest Turtle signal; an open position when its action is "buy". */
  turtle: TurtleSignal | null;
  /** Volume-confirmed breakouts in the last `recent` bars, newest first. */
  breakouts: Breakout[];
}

/**
 * Every price-chart detector in one pass, trimmed to recent events. Used by stock(...).patterns().
 * @example
 * patternReport(await vn.stock('FPT').history('1y')).zones
 */
export function patternReport(bars: Bar[], options: { recent?: number } = {}): PatternReport {
  const recent = options.recent ?? 10;
  const cutoff = bars.length > recent ? bars[bars.length - recent].time : "";
  const ex = extremeZones(bars);
  const t = turtleSignals(bars);
  return {
    zones: supportResistance(bars),
    extreme: ex.length ? ex[ex.length - 1].zone : null,
    candles: candlePatterns(bars)
      .filter((c) => c.time >= cutoff)
      .reverse(),
    turtle: t.length ? t[t.length - 1] : null,
    breakouts: breakouts(bars)
      .filter((b) => b.time >= cutoff)
      .reverse(),
  };
}
