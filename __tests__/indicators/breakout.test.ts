import { breakouts } from "../../src/indicators/breakout";
import { InvalidParameterError } from "../../src/errors";
import { bar, resetClock } from "./helpers";

beforeEach(resetClock);

const base = () => Array.from({ length: 20 }, (_, i) => bar(10, { high: 10.5, low: 9.5, volume: i % 2 ? 900 : 1100 }));

describe("breakouts", () => {
  it("flags an up breakout on heavy volume", () => {
    const bars = [...base(), bar(11, { high: 11.1, volume: 5000 })];
    expect(breakouts(bars)).toEqual([{ time: bars[20].time, direction: "up", level: 10.5, volumeZ: 40 }]);
  });

  it("ignores ordinary volume", () => {
    expect(breakouts([...base(), bar(11, { high: 11.1, volume: 1000 })])).toEqual([]);
  });

  it("flags a down breakout", () => {
    expect(breakouts([...base(), bar(9, { low: 8.9, volume: 5000 })])[0]).toMatchObject({ direction: "down", level: 9.5 });
  });

  it("needs the close beyond the level, not just the high", () => {
    expect(breakouts([...base(), bar(10.4, { high: 11, volume: 5000 })])).toEqual([]);
  });

  it("honours a custom volume threshold", () => {
    const bars = [...base(), bar(11, { high: 11.1, volume: 1150 })];
    expect(breakouts(bars)).toEqual([]);
    expect(breakouts(bars, { volumeZ: 1.5 })).toHaveLength(1);
  });

  it("honours a shorter lookback", () => {
    const bars = [bar(10, { high: 12, low: 9.5, volume: 1000 }), ...base(), bar(11, { high: 11.1, volume: 5000 })];
    expect(breakouts(bars, { lookback: 20 })).toHaveLength(1);
    expect(breakouts(bars, { lookback: 21 })).toEqual([]);
  });

  it("returns nothing for a series shorter than the lookback", () => {
    expect(breakouts(base().slice(0, 5))).toEqual([]);
    expect(breakouts([])).toEqual([]);
  });

  it("rejects bad options with a hint", () => {
    expect(() => breakouts([], { lookback: 1 })).toThrow(InvalidParameterError);
    expect(() => breakouts([], { volumeZ: NaN })).toThrow(InvalidParameterError);
    try {
      breakouts([], { lookback: 0 });
    } catch (e) {
      expect((e as InvalidParameterError).hint).toBeDefined();
    }
  });
});
