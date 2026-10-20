import { candlePatterns, CandlePattern } from "../../src/indicators/patterns";
import { Bar } from "../../src/types";
import { InvalidParameterError } from "../../src/errors";
import { walk, bar, resetClock } from "./helpers";

beforeEach(resetClock);

function wellFormed(bars: Bar[]): boolean {
  return bars.every((b) => b.low <= Math.min(b.open, b.close) && b.high >= Math.max(b.open, b.close) && b.low <= b.high);
}

function at(bars: Bar[], i: number) {
  return candlePatterns(bars).filter((p) => p.time === bars[i].time);
}

function names(bars: Bar[], i: number): CandlePattern[] {
  return at(bars, i).map((p) => p.pattern);
}

describe("candlePatterns hammer", () => {
  it("finds a hammer after a decline", () => {
    const bars = [...walk(10, 100, -1), bar(90.4, { open: 90.0, high: 90.42, low: 88, close: 90.4 })];
    expect(wellFormed(bars)).toBe(true);
    expect(at(bars, 10)).toEqual([{ time: bars[10].time, pattern: "hammer", bias: "bullish" }]);
  });

  it("does not call the same shape a hammer after a rally", () => {
    const bars = [...walk(10, 80, 1), bar(88.4, { open: 88.0, high: 88.42, low: 86, close: 88.4 })];
    expect(wellFormed(bars)).toBe(true);
    expect(candlePatterns(bars).some((p) => p.pattern === "hammer")).toBe(false);
  });

  it("needs a lower shadow of at least twice the body", () => {
    const bars = [...walk(10, 100, -1), bar(90.4, { open: 90.0, high: 90.42, low: 89.4, close: 90.4 })];
    expect(wellFormed(bars)).toBe(true);
    expect(names(bars, 10)).not.toContain("hammer");
  });

  it("allows only a short upper shadow", () => {
    const bars = [...walk(10, 100, -1), bar(90.4, { open: 90.0, high: 90.9, low: 88, close: 90.4 })];
    expect(wellFormed(bars)).toBe(true);
    expect(names(bars, 10)).not.toContain("hammer");
  });
});

describe("candlePatterns shooting_star", () => {
  it("finds a shooting star after a rally", () => {
    const bars = [...walk(10, 80, 1), bar(88.8, { open: 88.4, high: 91, low: 88.38, close: 88.8 })];
    expect(wellFormed(bars)).toBe(true);
    expect(at(bars, 10)).toEqual([{ time: bars[10].time, pattern: "shooting_star", bias: "bearish" }]);
  });

  it("does not call the same shape a shooting star after a decline", () => {
    const bars = [...walk(10, 100, -1), bar(90.8, { open: 90.4, high: 93, low: 90.38, close: 90.8 })];
    expect(wellFormed(bars)).toBe(true);
    expect(candlePatterns(bars).some((p) => p.pattern === "shooting_star")).toBe(false);
  });

  it("needs an upper shadow of at least twice the body", () => {
    const bars = [...walk(10, 80, 1), bar(88.8, { open: 88.4, high: 89.3, low: 88.38, close: 88.8 })];
    expect(wellFormed(bars)).toBe(true);
    expect(names(bars, 10)).not.toContain("shooting_star");
  });

  it("allows only a short lower shadow", () => {
    const bars = [...walk(10, 80, 1), bar(88.8, { open: 88.4, high: 91, low: 87.8, close: 88.8 })];
    expect(wellFormed(bars)).toBe(true);
    expect(names(bars, 10)).not.toContain("shooting_star");
  });
});

describe("candlePatterns doji", () => {
  it("gives a doji after a rally a bearish bias", () => {
    const bars = [...walk(10, 80, 1), bar(88.4, { open: 88.38, high: 89, low: 87.8, close: 88.4 })];
    expect(wellFormed(bars)).toBe(true);
    expect(at(bars, 10)).toEqual([{ time: bars[10].time, pattern: "doji", bias: "bearish" }]);
  });

  it("gives a doji after a decline a bullish bias", () => {
    const bars = [...walk(10, 100, -1), bar(90.4, { open: 90.38, high: 91, low: 89.8, close: 90.4 })];
    expect(wellFormed(bars)).toBe(true);
    expect(at(bars, 10)).toEqual([{ time: bars[10].time, pattern: "doji", bias: "bullish" }]);
  });

  it("rejects a body above a tenth of the range", () => {
    const bars = [...walk(10, 80, 1), bar(88.7, { open: 88.4, high: 89, low: 87.8, close: 88.7 })];
    expect(wellFormed(bars)).toBe(true);
    expect(names(bars, 10)).not.toContain("doji");
  });

  it("accepts a body of exactly a tenth of the range", () => {
    const bars = [...walk(10, 80, 1), bar(88.5, { open: 88.0, high: 90.5, low: 85.5, close: 88.5 })];
    expect(wellFormed(bars)).toBe(true);
    expect(names(bars, 10)).toContain("doji");
  });

  it("ignores a bar with no range", () => {
    const bars = [...walk(10, 80, 1), bar(88.4, { open: 88.4, high: 88.4, low: 88.4, close: 88.4 })];
    expect(candlePatterns(bars)).toEqual([]);
  });
});

describe("candlePatterns engulfing", () => {
  it("finds a bullish engulfing (starter fixture shape)", () => {
    const bars = [
      ...walk(28, 60, -0.5),
      bar(49.8, { open: 50.5, close: 49.8, high: 50.7, low: 49.6 }),
      bar(51.2, { open: 49.5, close: 51.2, high: 51.4, low: 49.4 }),
    ];
    expect(wellFormed(bars)).toBe(true);
    expect(at(bars, 29)).toEqual([{ time: bars[29].time, pattern: "bullish_engulfing", bias: "bullish" }]);
  });

  it("rejects a bullish candle that does not cover the previous body", () => {
    const bars = [
      ...walk(28, 60, -0.5),
      bar(49.8, { open: 50.5, close: 49.8, high: 50.7, low: 49.6 }),
      bar(50.3, { open: 49.5, close: 50.3, high: 50.4, low: 49.4 }),
    ];
    expect(wellFormed(bars)).toBe(true);
    expect(names(bars, 29)).not.toContain("bullish_engulfing");
  });

  it("rejects a bullish candle after a bullish candle", () => {
    const bars = [
      ...walk(28, 60, -0.5),
      bar(51.0, { open: 50.0, close: 51.0, high: 51.2, low: 49.9 }),
      bar(52.5, { open: 49.8, close: 52.5, high: 52.6, low: 49.7 }),
    ];
    expect(wellFormed(bars)).toBe(true);
    expect(names(bars, 29)).not.toContain("bullish_engulfing");
  });

  it("rejects a bullish candle with a body no larger than the previous one", () => {
    const bars = [
      ...walk(28, 60, -0.5),
      bar(50.0, { open: 50.5, close: 50.0, high: 50.6, low: 49.9 }),
      bar(50.5, { open: 50.0, close: 50.5, high: 50.6, low: 49.9 }),
    ];
    expect(wellFormed(bars)).toBe(true);
    expect(names(bars, 29)).not.toContain("bullish_engulfing");
  });

  it("finds a bearish engulfing", () => {
    const bars = [
      ...walk(28, 43.5, 0.5),
      bar(50.7, { open: 50.0, close: 50.7, high: 50.8, low: 49.9 }),
      bar(49.6, { open: 50.9, close: 49.6, high: 51.0, low: 49.5 }),
    ];
    expect(wellFormed(bars)).toBe(true);
    expect(at(bars, 29)).toEqual([{ time: bars[29].time, pattern: "bearish_engulfing", bias: "bearish" }]);
  });

  it("rejects a bearish candle that does not cover the previous body", () => {
    const bars = [
      ...walk(28, 43.5, 0.5),
      bar(50.7, { open: 50.0, close: 50.7, high: 50.8, low: 49.9 }),
      bar(50.2, { open: 50.9, close: 50.2, high: 51.0, low: 50.1 }),
    ];
    expect(wellFormed(bars)).toBe(true);
    expect(names(bars, 29)).not.toContain("bearish_engulfing");
  });

  it("rejects a bearish candle after a bearish candle", () => {
    const bars = [
      ...walk(28, 43.5, 0.5),
      bar(49.8, { open: 50.4, close: 49.8, high: 50.5, low: 49.7 }),
      bar(48.0, { open: 50.6, close: 48.0, high: 50.7, low: 47.9 }),
    ];
    expect(wellFormed(bars)).toBe(true);
    expect(names(bars, 29)).not.toContain("bearish_engulfing");
  });
});

describe("candlePatterns morning_star", () => {
  const lead = () => walk(12, 100, -1);

  it("finds a morning star", () => {
    const bars = [
      ...lead(),
      bar(86, { open: 88.5, high: 88.6, low: 85.9, close: 86 }),
      bar(85.8, { open: 85.6, high: 86.0, low: 85.4, close: 85.8 }),
      bar(88, { open: 86, high: 88.2, low: 85.9, close: 88 }),
    ];
    expect(wellFormed(bars)).toBe(true);
    expect(at(bars, 14)).toEqual([{ time: bars[14].time, pattern: "morning_star", bias: "bullish" }]);
  });

  it("rejects a final candle that stays below the midpoint of the first body", () => {
    const bars = [
      ...lead(),
      bar(86, { open: 88.5, high: 88.6, low: 85.9, close: 86 }),
      bar(85.8, { open: 85.6, high: 86.0, low: 85.4, close: 85.8 }),
      bar(87, { open: 86, high: 87.2, low: 85.9, close: 87 }),
    ];
    expect(wellFormed(bars)).toBe(true);
    expect(names(bars, 14)).not.toContain("morning_star");
  });

  it("rejects a middle candle with a large body", () => {
    const bars = [
      ...lead(),
      bar(86, { open: 88.5, high: 88.6, low: 85.9, close: 86 }),
      bar(86.2, { open: 85.2, high: 86.4, low: 85.1, close: 86.2 }),
      bar(88, { open: 86, high: 88.2, low: 85.9, close: 88 }),
    ];
    expect(wellFormed(bars)).toBe(true);
    expect(names(bars, 14)).not.toContain("morning_star");
  });

  it("rejects a first candle that is not longer than the recent average body", () => {
    const bars = [
      ...lead(),
      bar(87.7, { open: 88.5, high: 88.6, low: 87.6, close: 87.7 }),
      bar(87.5, { open: 87.4, high: 87.6, low: 87.3, close: 87.5 }),
      bar(88.4, { open: 87.5, high: 88.5, low: 87.4, close: 88.4 }),
    ];
    expect(wellFormed(bars)).toBe(true);
    expect(names(bars, 14)).not.toContain("morning_star");
  });
});

describe("candlePatterns evening_star", () => {
  const lead = () => walk(12, 100, 1);

  it("finds an evening star", () => {
    const bars = [
      ...lead(),
      bar(115, { open: 112.5, high: 115.1, low: 112.4, close: 115 }),
      bar(115.2, { open: 115.4, high: 115.6, low: 115.0, close: 115.2 }),
      bar(113, { open: 115, high: 115.2, low: 112.8, close: 113 }),
    ];
    expect(wellFormed(bars)).toBe(true);
    expect(at(bars, 14)).toEqual([{ time: bars[14].time, pattern: "evening_star", bias: "bearish" }]);
  });

  it("rejects a final candle that stays above the midpoint of the first body", () => {
    const bars = [
      ...lead(),
      bar(115, { open: 112.5, high: 115.1, low: 112.4, close: 115 }),
      bar(115.2, { open: 115.4, high: 115.6, low: 115.0, close: 115.2 }),
      bar(114, { open: 115, high: 115.2, low: 113.8, close: 114 }),
    ];
    expect(wellFormed(bars)).toBe(true);
    expect(names(bars, 14)).not.toContain("evening_star");
  });

  it("rejects a middle candle with a large body", () => {
    const bars = [
      ...lead(),
      bar(115, { open: 112.5, high: 115.1, low: 112.4, close: 115 }),
      bar(114.4, { open: 115.4, high: 115.6, low: 114.3, close: 114.4 }),
      bar(113, { open: 115, high: 115.2, low: 112.8, close: 113 }),
    ];
    expect(wellFormed(bars)).toBe(true);
    expect(names(bars, 14)).not.toContain("evening_star");
  });

  it("rejects a first candle that is not longer than the recent average body", () => {
    const bars = [
      ...lead(),
      bar(113.5, { open: 112.6, high: 113.6, low: 112.5, close: 113.5 }),
      bar(113.7, { open: 113.8, high: 113.9, low: 113.6, close: 113.7 }),
      bar(112.7, { open: 113.6, high: 113.7, low: 112.6, close: 112.7 }),
    ];
    expect(wellFormed(bars)).toBe(true);
    expect(names(bars, 14)).not.toContain("evening_star");
  });
});

describe("candlePatterns output", () => {
  it("returns every match for one bar in table order", () => {
    const bars = [...walk(10, 100, -1), bar(90.4, { open: 90.38, high: 90.4, low: 88, close: 90.4 })];
    expect(wellFormed(bars)).toBe(true);
    expect(at(bars, 10)).toEqual([
      { time: bars[10].time, pattern: "doji", bias: "bullish" },
      { time: bars[10].time, pattern: "hammer", bias: "bullish" },
    ]);
  });

  it("lists matches in chronological order", () => {
    const bars = [
      ...walk(28, 60, -0.5),
      bar(49.8, { open: 50.5, close: 49.8, high: 50.7, low: 49.6 }),
      bar(51.2, { open: 49.5, close: 51.2, high: 51.4, low: 49.4 }),
      bar(51.0, { open: 51.0, close: 51.0, high: 51.6, low: 50.4 }),
    ];
    const times = candlePatterns(bars).map((p) => p.time);
    expect(times.length).toBeGreaterThanOrEqual(2);
    expect(times).toEqual([...times].sort());
  });

  it("returns nothing for empty, single-bar or featureless input", () => {
    expect(candlePatterns([])).toEqual([]);
    expect(candlePatterns([bar(100)])).toEqual([]);
    expect(candlePatterns(walk(30, 100, 0.5))).toEqual([]);
  });

  it("stays quiet on trend-dependent patterns until the lookback is available", () => {
    const bars = [...walk(3, 100, -1), bar(97, { open: 96.7, high: 97.02, low: 94.5, close: 97 })];
    expect(wellFormed(bars)).toBe(true);
    expect(candlePatterns(bars)).toEqual([]);
  });
});

describe("candlePatterns trendLookback", () => {
  function pullbackHammer() {
    const rally = walk(10, 80, 1);
    const dip = walk(2, rally[9].close, -1);
    return [...rally, ...dip, bar(87, { open: 86.6, high: 87.02, low: 85, close: 87 })];
  }

  it("uses five bars by default", () => {
    const bars = pullbackHammer();
    expect(wellFormed(bars)).toBe(true);
    expect(names(bars, 12)).not.toContain("hammer");
  });

  it("reads a shorter lookback from options", () => {
    const bars = pullbackHammer();
    expect(candlePatterns(bars, { trendLookback: 2 }).filter((p) => p.time === bars[12].time)).toEqual([
      { time: bars[12].time, pattern: "hammer", bias: "bullish" },
    ]);
  });

  it("rejects a lookback below 1 with a hint", () => {
    expect(() => candlePatterns([], { trendLookback: 0 })).toThrow(InvalidParameterError);
    expect(() => candlePatterns([], { trendLookback: -3 })).toThrow(InvalidParameterError);
    expect(() => candlePatterns([], { trendLookback: 2.5 })).toThrow(InvalidParameterError);
    try {
      candlePatterns([], { trendLookback: 0 });
    } catch (e) {
      expect((e as InvalidParameterError).hint).toBeTruthy();
    }
  });
});
