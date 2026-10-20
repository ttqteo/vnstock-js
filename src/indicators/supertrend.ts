import { Bar } from "../types";
import { atr } from "./atr";

export interface SuperTrendOptions {
  period?: number;
  multiplier?: number;
}

export interface SuperTrendResult {
  time: string;
  superTrend: number | null;
  direction: "bullish" | "bearish" | null;
  upperBand: number | null;
  lowerBand: number | null;
}

/**
 * SuperTrend line and direction from ATR bands; defaults 10 periods, multiplier 3.
 * @example
 * superTrend(bars).at(-1)?.direction // "bullish"
 */
export function superTrend(data: Bar[], options: SuperTrendOptions = {}): SuperTrendResult[] {
  var period = options.period == null ? 10 : options.period;
  var multiplier = options.multiplier == null ? 3 : options.multiplier;

  if (period < 1) throw new Error("Period must be >= 1");
  if (multiplier <= 0) throw new Error("Multiplier must be > 0");
  if (data.length === 0) return [];

  var atrSeries = atr(data, period);

  var results: SuperTrendResult[] = new Array(data.length);
  var prevFinalUpper = 0;
  var prevFinalLower = 0;
  var prevSuperTrend = 0;
  var prevWasUpper = true;
  var initialized = false;

  for (var i = 0; i < data.length; i++) {
    var bar = data[i];
    var atrVal = atrSeries[i].atr;

    if (atrVal === null) {
      results[i] = {
        time: bar.time,
        superTrend: null,
        direction: null,
        upperBand: null,
        lowerBand: null,
      };
      continue;
    }

    var hl2 = (bar.high + bar.low) / 2;
    var basicUpper = hl2 + multiplier * atrVal;
    var basicLower = hl2 - multiplier * atrVal;

    var finalUpper: number;
    var finalLower: number;
    if (!initialized) {
      finalUpper = basicUpper;
      finalLower = basicLower;
    } else {
      var prevClose = data[i - 1].close;
      finalUpper = basicUpper < prevFinalUpper || prevClose > prevFinalUpper ? basicUpper : prevFinalUpper;
      finalLower = basicLower > prevFinalLower || prevClose < prevFinalLower ? basicLower : prevFinalLower;
    }

    var st: number;
    var dir: "bullish" | "bearish";
    if (!initialized) {
      if (bar.close <= finalUpper) {
        st = finalUpper;
        prevWasUpper = true;
      } else {
        st = finalLower;
        prevWasUpper = false;
      }
    } else {
      if (prevWasUpper) {
        if (bar.close <= finalUpper) {
          st = finalUpper;
          prevWasUpper = true;
        } else {
          st = finalLower;
          prevWasUpper = false;
        }
      } else {
        if (bar.close >= finalLower) {
          st = finalLower;
          prevWasUpper = false;
        } else {
          st = finalUpper;
          prevWasUpper = true;
        }
      }
    }
    dir = bar.close > st ? "bullish" : "bearish";

    results[i] = {
      time: bar.time,
      superTrend: st,
      direction: dir,
      upperBand: finalUpper,
      lowerBand: finalLower,
    };

    prevFinalUpper = finalUpper;
    prevFinalLower = finalLower;
    prevSuperTrend = st;
    initialized = true;
  }

  return results;
}
