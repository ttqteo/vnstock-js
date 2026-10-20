import { Bar } from "../types";
import { InvalidParameterError } from "../errors";

export interface MarketHealthEvent {
  time: string;
  type: "ftd" | "distribution";
}

export interface MarketHealth {
  /** Every follow-through day and distribution day in the series, sorted by time. */
  events: MarketHealthEvent[];
  /** Distribution days still live within the last `window` sessions. */
  distributionCount: number;
  status: "uptrend" | "pressure" | "correction";
}

export interface MarketHealthOptions {
  /** Minimum close-to-close drop in percent for a distribution day. Default 0.2. */
  distributionDrop?: number;
  /** Number of last sessions in which distribution days are counted. Default 25. */
  window?: number;
  /** A distribution day expires once a later close is this percent above its close. Default 5. */
  expireGain?: number;
  /** Minimum close-to-close gain in percent for a follow-through day. Default 1.25. */
  ftdGain?: number;
  /** First day of the rally attempt on which a follow-through day may occur. Default 4. */
  ftdMinDay?: number;
  /** Last day of the rally attempt on which a follow-through day may occur. Default 7. */
  ftdMaxDay?: number;
  /** A low is a close under every close of this many prior sessions. Default 25. */
  lowLookback?: number;
  /** Live distribution days at which the status turns to `pressure`. Default 5. */
  pressureCount?: number;
}

const EPSILON = 1e-9;

function requireInteger(name: string, value: number, min: number, fallback: number): void {
  if (!Number.isInteger(value) || value < min) {
    throw new InvalidParameterError(name, value, undefined, name + " must be a whole number of at least " + min + " (default " + fallback + ").");
  }
}

function requireNonNegative(name: string, value: number, fallback: number): void {
  if (!(value >= 0)) {
    throw new InvalidParameterError(name, value, undefined, name + " is a percent and must not be negative (default " + fallback + ").");
  }
}

/**
 * Health of a market index from distribution days and follow-through days, run on
 * index bars (for example VNINDEX, in points). Volume is the index volume.
 *
 * A distribution day is a close down at least `distributionDrop` percent on volume
 * above the previous session. `distributionCount` counts those in the last `window`
 * sessions, leaving out days that expired because a later close rose `expireGain`
 * percent above the close of that day. `events` still lists every one.
 *
 * A low is a session closing under all closes of the previous `lowLookback`
 * sessions, or a session whose low undercuts the low of the low being tracked; a
 * new low restarts the count. Day 1 of the rally attempt is the first session after
 * the low that closes up. A follow-through day is the first session on day
 * `ftdMinDay` to `ftdMaxDay` that gains at least `ftdGain` percent on volume above
 * the previous session. After day `ftdMaxDay` the index waits for a new low.
 *
 * Status is `correction` when the latest low came after the latest follow-through
 * day (or there is a low and no follow-through day yet), else `pressure` when
 * `distributionCount` reaches `pressureCount`, else `uptrend`. Without enough
 * history to find a low the status is `uptrend` and the events are only the
 * distribution days found.
 *
 * Method: theo phương pháp của William O'Neil (distribution days and follow-through
 * days as described in How to Make Money in Stocks).
 *
 * @example
 * const health = marketHealth(vnindexBars);
 * health.status; // "uptrend" | "pressure" | "correction"
 */
export function marketHealth(indexBars: Bar[], options: MarketHealthOptions = {}): MarketHealth {
  const distributionDrop = options.distributionDrop ?? 0.2;
  const window = options.window ?? 25;
  const expireGain = options.expireGain ?? 5;
  const ftdGain = options.ftdGain ?? 1.25;
  const ftdMinDay = options.ftdMinDay ?? 4;
  const ftdMaxDay = options.ftdMaxDay ?? 7;
  const lowLookback = options.lowLookback ?? 25;
  const pressureCount = options.pressureCount ?? 5;
  requireInteger("window", window, 1, 25);
  requireInteger("lowLookback", lowLookback, 1, 25);
  requireInteger("ftdMinDay", ftdMinDay, 1, 4);
  requireInteger("pressureCount", pressureCount, 1, 5);
  if (!Number.isInteger(ftdMaxDay) || ftdMaxDay < ftdMinDay) {
    throw new InvalidParameterError("ftdMaxDay", ftdMaxDay, undefined, "ftdMaxDay must be a whole number not below ftdMinDay (defaults 7 and 4).");
  }
  requireNonNegative("distributionDrop", distributionDrop, 0.2);
  requireNonNegative("expireGain", expireGain, 5);
  requireNonNegative("ftdGain", ftdGain, 1.25);

  const n = indexBars.length;
  const events: MarketHealthEvent[] = [];
  const distributionDays: number[] = [];
  let lowIndex = -1;
  let lowPrice = 0;
  let dayOne = -1;
  let confirmed = false;
  let lastLow = -1;
  let lastFtd = -1;

  for (let i = 1; i < n; i++) {
    const cur = indexBars[i];
    const prev = indexBars[i - 1];
    const change = prev.close > 0 ? (cur.close / prev.close - 1) * 100 : 0;
    const heavier = cur.volume > prev.volume;

    if (change <= -distributionDrop + EPSILON && change < 0 && heavier) {
      events.push({ time: cur.time, type: "distribution" });
      distributionDays.push(i);
    }

    let isLow = lowIndex >= 0 && cur.low < lowPrice;
    if (!isLow && i >= lowLookback) {
      let under = true;
      for (let j = i - lowLookback; j < i; j++) {
        if (cur.close >= indexBars[j].close) {
          under = false;
          break;
        }
      }
      isLow = under;
    }
    if (isLow) {
      lowIndex = i;
      lowPrice = cur.low;
      lastLow = i;
      dayOne = -1;
      confirmed = false;
      continue;
    }

    if (lowIndex < 0 || confirmed) continue;
    if (dayOne < 0) {
      if (change > 0) dayOne = i;
      else continue;
    }
    const day = i - dayOne + 1;
    if (day >= ftdMinDay && day <= ftdMaxDay && change >= ftdGain - EPSILON && change > 0 && heavier) {
      events.push({ time: cur.time, type: "ftd" });
      lastFtd = i;
      confirmed = true;
    }
  }

  let distributionCount = 0;
  const firstLive = n - window;
  for (let k = 0; k < distributionDays.length; k++) {
    const d = distributionDays[k];
    if (d < firstLive) continue;
    const ceiling = indexBars[d].close * (1 + expireGain / 100);
    let expired = false;
    for (let j = d + 1; j < n; j++) {
      if (indexBars[j].close >= ceiling - EPSILON) {
        expired = true;
        break;
      }
    }
    if (!expired) distributionCount++;
  }

  let status: MarketHealth["status"] = "uptrend";
  if (lastLow >= 0 && lastLow > lastFtd) status = "correction";
  else if (distributionCount >= pressureCount) status = "pressure";

  return { events, distributionCount, status };
}
