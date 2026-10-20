import { Bar } from "../types";
import { InvalidParameterError } from "../errors";
import { rsi } from "../indicators/rsi";
import { ema } from "../indicators/ema";
import { Signal } from "./backtest";

export type PresetName = "breakout" | "oversold_bounce" | "ema_cross";

/**
 * Highest high of the `lookback` daily bars before `date`, or null when fewer exist. The level of
 * both the 'breakout' alert and the 'breakout' backtest preset.
 * @example
 * breakoutLevel(bars, "2026-10-14", 20)
 */
export function breakoutLevel(bars: Bar[], date: string, lookback: number): number | null {
  const earlier = bars.filter((b) => b.time.substring(0, 10) < date);
  if (earlier.length < lookback) return null;
  return Math.max(...earlier.slice(-lookback).map((b) => b.high));
}

function crossedUp(prevA: number | null, prevB: number | null, a: number | null, b: number | null): boolean {
  return prevA !== null && prevB !== null && a !== null && b !== null && prevA <= prevB && a > b;
}

/** Signals the MCP server and `backtest()` accept by name. Each reads only the bars it is given. */
export const PRESETS: Record<PresetName, Signal> = {
  // The close clears the highest high of the previous 20 sessions.
  breakout: (bars) => {
    const last = bars[bars.length - 1];
    const level = last ? breakoutLevel(bars, last.time.substring(0, 10), 20) : null;
    return level !== null && last.close > level;
  },
  // Wilder's RSI 14 climbs back over 30.
  oversold_bounce: (bars) => {
    if (bars.length < 16) return false;
    const r = rsi(bars, { period: 14 });
    const prev = r[r.length - 2].rsi;
    const cur = r[r.length - 1].rsi;
    return prev !== null && cur !== null && prev < 30 && cur >= 30;
  },
  // EMA 20 crosses above EMA 50.
  ema_cross: (bars) => {
    if (bars.length < 51) return false;
    const fast = ema(bars, { period: 20 });
    const slow = ema(bars, { period: 50 });
    const n = bars.length;
    return crossedUp(fast[n - 2].ema, slow[n - 2].ema, fast[n - 1].ema, slow[n - 1].ema);
  },
};

/**
 * A signal function as is, or the preset of that name.
 * @example
 * resolveSignal("breakout")(bars)
 */
export function resolveSignal(signal: Signal | PresetName): Signal {
  if (typeof signal === "function") return signal;
  if (typeof signal === "string" && Object.prototype.hasOwnProperty.call(PRESETS, signal)) return PRESETS[signal];
  throw new InvalidParameterError("signal", signal, Object.keys(PRESETS), "Pass a function (bars) => boolean | string, or a preset name.");
}
