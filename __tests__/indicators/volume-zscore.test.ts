import { volumeZScore } from "../../src/indicators/volume-zscore";
import { InvalidParameterError } from "../../src/errors";
import { bar, resetClock } from "./helpers";

beforeEach(resetClock);

describe("volumeZScore", () => {
  it("measures against the previous window only", () => {
    const bars = [...Array.from({ length: 20 }, (_, i) => bar(10, { volume: i % 2 === 0 ? 900 : 1100 })), bar(10, { volume: 3000 })];
    const z = volumeZScore(bars, { period: 20 });
    expect(z[19].z).toBeNull();
    expect(z[20].z).toBeCloseTo(20, 6);
  });

  it("returns one point per bar with its time", () => {
    const bars = Array.from({ length: 5 }, () => bar(10));
    const z = volumeZScore(bars, { period: 3 });
    expect(z.map((p) => p.time)).toEqual(bars.map((b) => b.time));
    expect(z.slice(0, 3).every((p) => p.z === null)).toBe(true);
  });

  it("gives 0 when the window has no spread", () => {
    const bars = [...Array.from({ length: 3 }, () => bar(10, { volume: 1000 })), bar(10, { volume: 5000 })];
    expect(volumeZScore(bars, { period: 3 })[3].z).toBe(0);
  });

  it("defaults to a 20 bar window", () => {
    const bars = Array.from({ length: 21 }, () => bar(10));
    const z = volumeZScore(bars);
    expect(z[19].z).toBeNull();
    expect(z[20].z).toBe(0);
  });

  it("returns an empty array for empty input", () => {
    expect(volumeZScore([])).toEqual([]);
  });

  it("rejects a period under 2 with a hint", () => {
    expect(() => volumeZScore([], { period: 1 })).toThrow(InvalidParameterError);
    try {
      volumeZScore([], { period: NaN });
    } catch (e) {
      expect((e as InvalidParameterError).hint).toBeDefined();
    }
  });
});
