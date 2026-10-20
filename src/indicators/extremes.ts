import { Bar } from "../types";
import { rsi } from "./rsi";
import { bollinger } from "./bollinger";
import { InvalidParameterError } from "../errors";

export interface ExtremePoint {
  time: string;
  zone: "bottom" | "top" | null;
}

/**
 * Possible short-term bottoms and tops: RSI beyond a threshold while the bar's
 * extreme touches the opposite Bollinger band. A bar is a `bottom` when RSI is
 * below `lower` and its low is at or under the lower band, and a `top` when RSI
 * is above `upper` and its high is at or over the upper band.
 *
 * Method: Wilder's RSI combined with Bollinger Bands, both published methods.
 *
 * @example
 * extremeZones(bars, { rsiPeriod: 14, lower: 30, upper: 70 }).filter((p) => p.zone)
 */
export function extremeZones(
  bars: Bar[],
  options: { rsiPeriod?: number; lower?: number; upper?: number; bbPeriod?: number; bbStdDev?: number } = {}
): ExtremePoint[] {
  const rsiPeriod = options.rsiPeriod ?? 14;
  const lower = options.lower ?? 30;
  const upper = options.upper ?? 70;
  const bbPeriod = options.bbPeriod ?? 20;
  const bbStdDev = options.bbStdDev ?? 2;
  if (rsiPeriod < 1) throw new InvalidParameterError("rsiPeriod", rsiPeriod, undefined, "rsiPeriod must be at least 1 (default 14).");
  if (bbPeriod < 1) throw new InvalidParameterError("bbPeriod", bbPeriod, undefined, "bbPeriod must be at least 1 (default 20).");
  if (lower >= upper) throw new InvalidParameterError("lower", lower, undefined, "lower must be below upper (defaults 30 and 70).");
  const r = rsi(bars, { period: rsiPeriod });
  const b = bollinger(bars, { period: bbPeriod, stddev: bbStdDev });
  return bars.map((bar, i) => {
    const rv = r[i].rsi;
    const lo = b[i].lower;
    const hi = b[i].upper;
    let zone: ExtremePoint["zone"] = null;
    if (rv !== null && lo !== null && rv < lower && bar.low <= lo) zone = "bottom";
    else if (rv !== null && hi !== null && rv > upper && bar.high >= hi) zone = "top";
    return { time: bar.time, zone };
  });
}
