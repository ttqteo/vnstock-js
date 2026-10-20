import { Bar } from "../types";
import { atr } from "./atr";
import { ema } from "./ema";
import { InvalidParameterError } from "../errors";

export interface TurtleSignal {
  time: string;
  action: "buy" | "sell";
  /** Close of the signal bar. */
  price: number;
  /** Fixed ATR stop of the position. On a sell it is the stop of the position just closed. */
  stop: number;
  /** Vietnamese explanation with the numbers in input units, rounded to 2 digits. */
  reason: string;
}

export interface TurtleOptions {
  /** Breakout window in sessions: buy when the close clears the highest high of the prior `entry` bars. Default 20. */
  entry?: number;
  /** Breakdown window in sessions: sell when the close falls under the lowest low of the prior `exit` bars. Default 10. */
  exit?: number;
  /** ATR period used for the stop. Default 20. */
  atrPeriod?: number;
  /** Stop distance as a multiple of ATR below the entry close. Default 2. */
  stopAtr?: number;
  /** Only buy while the close is above the trend EMA. Default true. */
  trendFilter?: boolean;
  /** EMA period of the trend filter. Default 200. */
  trendPeriod?: number;
}

function num(n: number): string {
  return String(Math.round(n * 100) / 100);
}

/**
 * Long-only Turtle breakout signals: buy on an N-day high, exit on an M-day low or an ATR stop.
 * Vietnamese cash equities cannot be sold short, so there are only buy and sell (exit) signals.
 * Method: Turtle Trading rules as published in Curtis Faith, "Way of the Turtle" (System 1, simplified).
 * @example
 * turtleSignals(await vn.stock('FPT').history('2y'), { entry: 20, exit: 10, stopAtr: 2 })
 */
export function turtleSignals(bars: Bar[], options: TurtleOptions = {}): TurtleSignal[] {
  const entry = options.entry ?? 20;
  const exit = options.exit ?? 10;
  const atrPeriod = options.atrPeriod ?? 20;
  const stopAtr = options.stopAtr ?? 2;
  const useTrend = options.trendFilter !== false;
  const trendPeriod = options.trendPeriod ?? 200;
  if (!(entry >= 2)) throw new InvalidParameterError("entry", entry, undefined, "entry is a breakout window in sessions, at least 2.");
  if (!(exit >= 2)) throw new InvalidParameterError("exit", exit, undefined, "exit is a breakdown window in sessions, at least 2.");
  if (!(atrPeriod >= 1)) throw new InvalidParameterError("atrPeriod", atrPeriod, undefined, "atrPeriod must be at least 1 (default 20).");
  if (!(stopAtr > 0)) throw new InvalidParameterError("stopAtr", stopAtr, undefined, "stopAtr must be positive, e.g. 2.");
  if (useTrend && !(trendPeriod >= 1)) {
    throw new InvalidParameterError("trendPeriod", trendPeriod, undefined, "trendPeriod must be at least 1 (default 200).");
  }

  const a = atr(bars, atrPeriod);
  const trend = useTrend ? ema(bars, { period: trendPeriod }) : null;
  const out: TurtleSignal[] = [];
  let stop: number | null = null;

  for (let i = entry; i < bars.length; i++) {
    const b = bars[i];
    if (stop === null) {
      let hi = -Infinity;
      for (let j = i - entry; j < i; j++) hi = Math.max(hi, bars[j].high);
      const atrNow = a[i].atr;
      const trendNow = trend === null ? null : trend[i].ema;
      const trendOk = trend === null || (trendNow !== null && b.close > trendNow);
      if (b.close > hi && atrNow !== null && trendOk) {
        stop = b.close - stopAtr * atrNow;
        out.push({
          time: b.time,
          action: "buy",
          price: b.close,
          stop,
          reason: "phá đỉnh " + entry + " phiên " + num(hi) + ", dừng lỗ " + num(stop),
        });
      }
      continue;
    }
    if (b.close < stop) {
      out.push({ time: b.time, action: "sell", price: b.close, stop, reason: "chạm dừng lỗ " + num(stop) });
      stop = null;
      continue;
    }
    if (i >= exit) {
      let lo = Infinity;
      for (let j = i - exit; j < i; j++) lo = Math.min(lo, bars[j].low);
      if (b.close < lo) {
        out.push({ time: b.time, action: "sell", price: b.close, stop, reason: "thủng đáy " + exit + " phiên " + num(lo) });
        stop = null;
      }
    }
  }
  return out;
}
