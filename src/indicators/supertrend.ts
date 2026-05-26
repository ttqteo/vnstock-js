import { QuoteHistory } from "../models/normalized";
import { atr } from "./atr";

export interface SuperTrendOptions {
  period?: number;
  multiplier?: number;
}

export interface SuperTrendResult {
  date: string;
  superTrend: number | null;
  direction: "bullish" | "bearish" | null;
  upperBand: number | null;
  lowerBand: number | null;
}

export function superTrend(
  data: QuoteHistory[],
  options: SuperTrendOptions = {}
): SuperTrendResult[] {
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
        date: bar.date,
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
      finalUpper =
        basicUpper < prevFinalUpper || prevClose > prevFinalUpper
          ? basicUpper
          : prevFinalUpper;
      finalLower =
        basicLower > prevFinalLower || prevClose < prevFinalLower
          ? basicLower
          : prevFinalLower;
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
      date: bar.date,
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
