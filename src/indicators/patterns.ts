import { Bar } from "../types";
import { InvalidParameterError } from "../errors";

export type CandlePattern = "bullish_engulfing" | "bearish_engulfing" | "hammer" | "shooting_star" | "doji" | "morning_star" | "evening_star";

export interface CandlePatternHit {
  /** Time of the bar that completes the pattern. */
  time: string;
  pattern: CandlePattern;
  bias: "bullish" | "bearish";
}

const AVG_BODY_WINDOW = 10;

/**
 * Classic reversal candlestick patterns: doji, hammer, shooting star, bullish and
 * bearish engulfing, morning and evening star. One hit per pattern per bar, so a
 * bar matching several patterns yields several hits in the order doji, hammer,
 * shooting_star, bullish_engulfing, bearish_engulfing, morning_star, evening_star.
 *
 * Definitions use body = |close - open|, range = high - low, upper and lower
 * shadows. The prior trend is `down` when the previous close is below the close
 * `trendLookback` bars earlier, otherwise `up`. Trend-dependent patterns (doji,
 * hammer, shooting star) need `trendLookback + 1` bars of history. Morning and
 * evening star compare the first candle with the average body of up to 10 bars
 * before it. Thresholds follow the commonly published ones:
 * doji body <= 10% of range; hammer and shooting star shadow >= 2x body with the
 * opposite shadow <= 25% of body; star middle body < 30% of the first body.
 * A doji takes the bias opposite to the prior trend.
 *
 * Method: Steve Nison, Japanese Candlestick Charting Techniques.
 *
 * @example
 * candlePatterns(bars).filter((p) => p.bias === "bullish")
 */
export function candlePatterns(bars: Bar[], options: { trendLookback?: number } = {}): CandlePatternHit[] {
  const lookback = options.trendLookback ?? 5;
  if (!Number.isInteger(lookback) || lookback < 1) {
    throw new InvalidParameterError("trendLookback", lookback, undefined, "trendLookback must be a whole number of at least 1 (default 5).");
  }

  const bodies: number[] = [];
  const cumulative: number[] = [0];
  for (let i = 0; i < bars.length; i++) {
    bodies.push(Math.abs(bars[i].close - bars[i].open));
    cumulative.push(cumulative[i] + bodies[i]);
  }

  function avgBodyBefore(index: number): number | null {
    if (index < 1) return null;
    const from = Math.max(0, index - AVG_BODY_WINDOW);
    return (cumulative[index] - cumulative[from]) / (index - from);
  }

  const out: CandlePatternHit[] = [];
  for (let i = 0; i < bars.length; i++) {
    const cur = bars[i];
    const body = bodies[i];
    const range = cur.high - cur.low;
    const upper = cur.high - Math.max(cur.open, cur.close);
    const lower = Math.min(cur.open, cur.close) - cur.low;
    const trend: "up" | "down" | null = i - 1 - lookback >= 0 ? (bars[i - 1].close < bars[i - 1 - lookback].close ? "down" : "up") : null;

    const add = (pattern: CandlePattern, bias: CandlePatternHit["bias"]) => {
      out.push({ time: cur.time, pattern, bias });
    };

    if (trend !== null && range > 0 && body <= 0.1 * range) {
      add("doji", trend === "up" ? "bearish" : "bullish");
    }
    if (trend === "down" && body > 0 && lower >= 2 * body && upper <= 0.25 * body) {
      add("hammer", "bullish");
    }
    if (trend === "up" && body > 0 && upper >= 2 * body && lower <= 0.25 * body) {
      add("shooting_star", "bearish");
    }

    if (i >= 1) {
      const prev = bars[i - 1];
      if (prev.close < prev.open && cur.close > cur.open && cur.open <= prev.close && cur.close >= prev.open && body > bodies[i - 1]) {
        add("bullish_engulfing", "bullish");
      }
      if (prev.close > prev.open && cur.close < cur.open && cur.open >= prev.close && cur.close <= prev.open && body > bodies[i - 1]) {
        add("bearish_engulfing", "bearish");
      }
    }

    if (i >= 2) {
      const first = bars[i - 2];
      const avg = avgBodyBefore(i - 2);
      const longFirst = avg !== null && bodies[i - 2] > avg;
      const smallMiddle = bodies[i - 1] < 0.3 * bodies[i - 2];
      const mid = (first.open + first.close) / 2;
      if (longFirst && smallMiddle && first.close < first.open && cur.close > cur.open && cur.close > mid) {
        add("morning_star", "bullish");
      }
      if (longFirst && smallMiddle && first.close > first.open && cur.close < cur.open && cur.close < mid) {
        add("evening_star", "bearish");
      }
    }
  }
  return out;
}
