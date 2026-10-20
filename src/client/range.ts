import { Interval, Range } from "../types";
import { InvalidParameterError } from "../errors";
import { ictToday } from "../shared/time";

export const RANGES: Range[] = ["1d", "5d", "1mo", "3mo", "6mo", "ytd", "1y", "2y", "5y", "max"];
export const INTERVALS: Interval[] = ["1m", "5m", "15m", "30m", "1h", "1d", "1w", "1mo"];

export interface Window {
  from: string;
  to: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function shiftDays(date: string, days: number): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().substring(0, 10);
}

/** Calendar month shift that clamps to the last day of the target month (03-31 minus 1mo is 02-28). */
function shiftMonths(date: string, months: number): string {
  const d = new Date(date + "T00:00:00Z");
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString().substring(0, 10);
}

function rangeHint(value: string): string | undefined {
  const m = /^(\d+)m$/.exec(value);
  if (m) {
    const words: Record<string, string> = { "1": "one month", "3": "three months", "6": "six months" };
    return 'Use "' + m[1] + 'mo" for ' + (words[m[1]] || m[1] + " months") + '; "m" is not a unit here.';
  }
  if (/^\d+[dD]$/.test(value) && value !== "1d" && value !== "5d") return 'Supported day ranges are "1d" and "5d"; pass { from } for others.';
  return undefined;
}

/**
 * Turns a range or explicit dates into an inclusive from/to window of ICT dates.
 * Day ranges are calendar padded: "1d" goes back 4 calendar days and "5d" back 7 so a weekend
 * or holiday still leaves enough sessions; the handle then keeps the last 1 or 5 bars.
 * @example
 * resolveWindow("6mo") // { from: "2026-04-14", to: "2026-10-14" }
 */
export function resolveWindow(input: Range | { from: string; to?: string }, now: number = Date.now()): Window {
  const today = ictToday(now);
  if (typeof input === "object") {
    const to = input.to || today;
    for (const [k, v] of [
      ["from", input.from],
      ["to", to],
    ] as const) {
      if (!DATE_RE.test(v)) throw new InvalidParameterError(k, v, undefined, "Dates are YYYY-MM-DD.");
    }
    if (input.from > to) throw new InvalidParameterError("from", input.from, undefined, '"from" must not be after "to".');
    return { from: input.from, to };
  }
  switch (input) {
    case "1d":
      return { from: shiftDays(today, -4), to: today };
    case "5d":
      return { from: shiftDays(today, -7), to: today };
    case "1mo":
      return { from: shiftMonths(today, -1), to: today };
    case "3mo":
      return { from: shiftMonths(today, -3), to: today };
    case "6mo":
      return { from: shiftMonths(today, -6), to: today };
    case "ytd":
      return { from: today.substring(0, 4) + "-01-01", to: today };
    case "1y":
      return { from: shiftMonths(today, -12), to: today };
    case "2y":
      return { from: shiftMonths(today, -24), to: today };
    case "5y":
      return { from: shiftMonths(today, -60), to: today };
    case "max":
      return { from: "2000-01-01", to: today };
  }
  throw new InvalidParameterError("range", input, RANGES, rangeHint(String(input)));
}

/** The source candle frame an interval is resampled from. */
export function sourceInterval(interval: Interval): "ONE_MINUTE" | "ONE_HOUR" | "ONE_DAY" {
  if (interval === "1h") return "ONE_HOUR";
  if (interval === "1m" || interval === "5m" || interval === "15m" || interval === "30m") return "ONE_MINUTE";
  if (interval === "1d" || interval === "1w" || interval === "1mo") return "ONE_DAY";
  throw new InvalidParameterError("interval", interval, INTERVALS);
}
