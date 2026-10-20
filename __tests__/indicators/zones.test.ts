import { supportResistance } from "../../src/indicators/zones";
import { atr } from "../../src/indicators/atr";
import { series, resetClock } from "./helpers";
import { InvalidParameterError } from "../../src/errors";

beforeEach(resetClock);

// Range between ~100 and ~110, last close 105. High = close + 0.3, low = close - 0.3.
const RANGE = [104, 106, 108, 110, 108, 106, 104, 102, 100, 102, 104, 106, 108, 110.2, 108, 106, 104, 102, 100.4, 102, 104, 105];

// Three swing highs near 110, two swing lows near 100, last close 101 (support is nearest).
const THREE_TOPS = [
  104, 106, 108, 110, 108, 106, 104, 102, 100, 102, 104, 106, 108, 110, 108, 106, 104, 102, 100, 102, 104, 106, 108, 110, 108, 106, 104, 102, 101,
];

describe("supportResistance", () => {
  it("finds a resistance near 110 and a support near 100, each touched twice", () => {
    const bars = series(RANGE);
    const zones = supportResistance(bars, { window: 3, tolerance: 0.01 });
    expect(zones).toHaveLength(2);
    const res = zones.find((z) => z.kind === "resistance")!;
    const sup = zones.find((z) => z.kind === "support")!;
    expect(res.touches).toBe(2);
    expect(res.low).toBeLessThanOrEqual(110.3);
    expect(res.high).toBeGreaterThanOrEqual(110.5);
    expect(sup.low).toBeLessThanOrEqual(99.7);
    expect(sup.high).toBeGreaterThanOrEqual(100.1);
    expect(sup.lastTouch).toBe(bars[18].time);
  });

  it("keeps the nearest zone when touch counts tie and respects maxZones", () => {
    const zones = supportResistance(series(RANGE), { window: 3, tolerance: 0.01, maxZones: 1 });
    expect(zones).toHaveLength(1);
    expect(zones[0].kind).toBe("support");
  });

  it("ranks zones with more touches first, before distance", () => {
    const zones = supportResistance(series(THREE_TOPS), { window: 3, tolerance: 0.01, maxZones: 1 });
    expect(zones).toHaveLength(1);
    expect(zones[0].kind).toBe("resistance");
    expect(zones[0].touches).toBe(3);
  });

  it("drops zones below minTouches", () => {
    const zones = supportResistance(series(THREE_TOPS), { window: 3, tolerance: 0.01, minTouches: 3 });
    expect(zones.map((z) => z.kind)).toEqual(["resistance"]);
  });

  it("does not merge pivots further apart than the tolerance", () => {
    const zones = supportResistance(series(RANGE), { window: 3, tolerance: 0.0001, minTouches: 1 });
    expect(zones).toHaveLength(4);
    expect(zones.every((z) => z.touches === 1)).toBe(true);
  });

  it("keeps every zone at least half an ATR(14) thick", () => {
    const bars = series(RANGE);
    const lastAtr = atr(bars, 14).pop()!.atr!;
    const zones = supportResistance(bars, { window: 3, tolerance: 0.01 });
    for (const z of zones) {
      expect(z.high - z.low).toBeGreaterThanOrEqual(lastAtr / 2 - 1e-9);
    }
  });

  it("rejects a window below 1", () => {
    expect(() => supportResistance(series(RANGE), { window: 0 })).toThrow(InvalidParameterError);
  });

  it("rejects maxZones below 1, minTouches below 1 and a negative tolerance", () => {
    expect(() => supportResistance(series(RANGE), { maxZones: 0 })).toThrow(InvalidParameterError);
    expect(() => supportResistance(series(RANGE), { minTouches: 0 })).toThrow(InvalidParameterError);
    expect(() => supportResistance(series(RANGE), { tolerance: -0.01 })).toThrow(InvalidParameterError);
  });

  it("returns no zones for a short or empty series", () => {
    expect(supportResistance(series([1, 2, 3]), { window: 5 })).toEqual([]);
    expect(supportResistance([])).toEqual([]);
  });
});
