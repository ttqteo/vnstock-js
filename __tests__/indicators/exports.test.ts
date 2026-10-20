import * as indicators from "../../src/indicators";

describe("vnstock-js/indicators exports", () => {
  it.each(["supportResistance", "extremeZones", "candlePatterns", "turtleSignals", "marketHealth", "volumeZScore", "breakouts", "swingPivots"])(
    "exports %s as a function",
    (name) => {
      expect(typeof (indicators as Record<string, unknown>)[name]).toBe("function");
    }
  );

  it("keeps the existing indicators", () => {
    for (const name of ["sma", "ema", "rsi", "macd", "bollinger", "atr", "superTrend", "ichimoku", "ichimokuFutureCloud"]) {
      expect(typeof (indicators as Record<string, unknown>)[name]).toBe("function");
    }
  });
});

// Compile-time check that every new type is exported.
export type ExportedTypes = [
  indicators.Pivot,
  indicators.PriceZone,
  indicators.SupportResistanceOptions,
  indicators.ExtremePoint,
  indicators.CandlePattern,
  indicators.CandlePatternHit,
  indicators.CandleHit,
  indicators.TurtleSignal,
  indicators.TurtleOptions,
  indicators.MarketHealth,
  indicators.MarketHealthEvent,
  indicators.MarketHealthOptions,
  indicators.VolumeZPoint,
  indicators.VolumeZScoreOptions,
  indicators.Breakout,
  indicators.BreakoutOptions,
];
