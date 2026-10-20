import { Bar, Interval } from "../types";

function isoWeekKey(date: string): string {
  const d = new Date(date.substring(0, 10) + "T00:00:00Z");
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().substring(0, 10);
}

function minuteBucketKey(time: string, size: number): string {
  const hh = parseInt(time.substring(11, 13), 10);
  const mm = parseInt(time.substring(14, 16), 10);
  const total = hh * 60 + mm;
  const start = total - (total % size);
  const pad = (n: number) => (n < 10 ? "0" : "") + n;
  return time.substring(0, 11) + pad(Math.floor(start / 60)) + ":" + pad(start % 60) + ":00+07:00";
}

/**
 * Aggregate bars into a coarser interval. Daily and longer buckets are stamped
 * with their first session; minute buckets with their wall-clock slot start
 * (HOSE opens at 09:15, so the 30m slot 09:00 holds 09:15 to 09:29).
 * Minute bars carry session-cumulative turnover, so a minute bucket keeps the last value instead of a sum.
 * Intervals the source serves natively come back as the same array.
 * @example
 * resample(dailyBars, "1w")
 */
export function resample(bars: Bar[], interval: Interval): Bar[] {
  let keyOf: (b: Bar) => string;
  let stampWithKey = false;
  let cumulative = false;
  if (interval === "1w") keyOf = (b) => isoWeekKey(b.time);
  else if (interval === "1mo") keyOf = (b) => b.time.substring(0, 7);
  else if (interval === "5m" || interval === "15m" || interval === "30m") {
    const size = parseInt(interval, 10);
    keyOf = (b) => minuteBucketKey(b.time, size);
    stampWithKey = true;
    cumulative = true;
  } else return bars;

  const out: Bar[] = [];
  let key = "";
  let cur: Bar | null = null;
  for (const b of bars) {
    const k = keyOf(b);
    if (cur && k === key) {
      cur.high = Math.max(cur.high, b.high);
      cur.low = Math.min(cur.low, b.low);
      cur.close = b.close;
      cur.volume += b.volume;
      if (cumulative) cur.value = b.value ?? cur.value;
      else cur.value = cur.value === null || b.value === null ? null : cur.value + b.value;
      continue;
    }
    if (cur) out.push(cur);
    key = k;
    cur = { ...b, time: stampWithKey ? k : b.time };
  }
  if (cur) out.push(cur);
  return out;
}
