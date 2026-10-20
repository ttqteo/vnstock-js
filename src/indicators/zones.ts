import { Bar } from "../types";
import { atr } from "./atr";
import { swingPivots } from "./pivots";
import { InvalidParameterError } from "../errors";

export interface PriceZone {
  low: number;
  high: number;
  kind: "support" | "resistance";
  touches: number;
  lastTouch: string;
}

export interface SupportResistanceOptions {
  /** Bars on each side of a swing pivot. Default 5. */
  window?: number;
  /** Maximum number of zones returned. Default 4. */
  maxZones?: number;
  /** Relative distance to the cluster mean within which pivots merge. Default 0.015 (1.5%). */
  tolerance?: number;
  /** Minimum number of pivots a zone needs. Default 2. */
  minTouches?: number;
}

/**
 * Support and resistance zones from clustered swing pivots, ranked by touch count
 * (ties broken by distance to the last close), then cut to `maxZones`.
 * Method: swing highs and lows are grouped when within `tolerance` of the cluster mean;
 * a zone spans its lowest to highest pivot and is at least half an ATR(14) thick.
 * @example
 * supportResistance(await vn.stock('HPG').history('1y'), { window: 5, maxZones: 4 })
 */
export function supportResistance(bars: Bar[], options: SupportResistanceOptions = {}): PriceZone[] {
  const window = options.window !== undefined ? options.window : 5;
  const maxZones = options.maxZones !== undefined ? options.maxZones : 4;
  const tolerance = options.tolerance !== undefined ? options.tolerance : 0.015;
  const minTouches = options.minTouches !== undefined ? options.minTouches : 2;
  if (window < 1) {
    throw new InvalidParameterError("window", window, undefined, "window is the number of bars on each side of a pivot, at least 1.");
  }
  if (maxZones < 1) {
    throw new InvalidParameterError("maxZones", maxZones, undefined, "maxZones must be at least 1.");
  }
  if (tolerance < 0) {
    throw new InvalidParameterError("tolerance", tolerance, undefined, "tolerance is a relative distance such as 0.015 for 1.5%, not below 0.");
  }
  if (minTouches < 1) {
    throw new InvalidParameterError("minTouches", minTouches, undefined, "minTouches must be at least 1.");
  }

  const pivots = swingPivots(bars, window).sort((a, b) => a.price - b.price);
  if (pivots.length === 0) return [];

  const clusters: { min: number; max: number; sum: number; n: number; last: string }[] = [];
  for (const p of pivots) {
    const c = clusters[clusters.length - 1];
    if (c && Math.abs(p.price - c.sum / c.n) / (c.sum / c.n) <= tolerance) {
      c.min = Math.min(c.min, p.price);
      c.max = Math.max(c.max, p.price);
      c.sum += p.price;
      c.n++;
      if (p.time > c.last) c.last = p.time;
    } else {
      clusters.push({ min: p.price, max: p.price, sum: p.price, n: 1, last: p.time });
    }
  }

  const lastClose = bars[bars.length - 1].close;
  const a = atr(bars, 14);
  const lastAtr = (a.length > 0 && a[a.length - 1].atr) || 0;

  return clusters
    .filter((c) => c.n >= minTouches)
    .map((c) => {
      const mid = (c.min + c.max) / 2;
      const half = Math.max((c.max - c.min) / 2, lastAtr / 4);
      const zone: PriceZone = {
        low: mid - half,
        high: mid + half,
        kind: mid > lastClose ? "resistance" : "support",
        touches: c.n,
        lastTouch: c.last,
      };
      return { zone, dist: Math.abs(mid - lastClose) };
    })
    .sort((x, y) => y.zone.touches - x.zone.touches || x.dist - y.dist)
    .slice(0, maxZones)
    .map((x) => x.zone);
}
