import { extremeZones } from "../../src/indicators/extremes";
import { bar, resetClock } from "./helpers";
import { InvalidParameterError } from "../../src/errors";

beforeEach(resetClock);

function choppy(n: number, mid: number) {
  return Array.from({ length: n }, (_, i) => bar(i % 2 ? mid + 0.5 : mid - 0.5));
}

function moves(start: number, pct: number, n: number) {
  const out = [];
  let p = start;
  for (let i = 0; i < n; i++) {
    const next = p * (1 + pct / 100);
    out.push(bar(next, { open: p, high: Math.max(p, next), low: Math.min(p, next) }));
    p = next;
  }
  return out;
}

describe("extremeZones", () => {
  it("marks a bottom after a sharp drop that pierces the lower band", () => {
    const bars = [...choppy(25, 100), ...moves(100, -4, 4)];
    const z = extremeZones(bars);
    expect(z).toHaveLength(bars.length);
    expect(z[z.length - 1]).toEqual({ time: bars[bars.length - 1].time, zone: "bottom" });
    expect(z.slice(0, 25).every((x) => x.zone === null)).toBe(true);
  });

  it("marks a top after a sharp rally", () => {
    const bars = [...choppy(25, 100), ...moves(100, 4, 4)];
    expect(extremeZones(bars).at(-1)!.zone).toBe("top");
  });

  it("returns one null point per bar while indicators are still warming up", () => {
    const bars = choppy(10, 100);
    const z = extremeZones(bars);
    expect(z).toHaveLength(10);
    expect(z.every((x, i) => x.zone === null && x.time === bars[i].time)).toBe(true);
  });

  it("returns an empty array for no bars", () => {
    expect(extremeZones([])).toEqual([]);
  });

  it("does not mark a bottom when RSI does not fall below the lower threshold", () => {
    const bars = [...choppy(25, 100), ...moves(100, -4, 4)];
    const strict = extremeZones(bars, { lower: 1 });
    expect(strict.every((x) => x.zone === null)).toBe(true);
  });

  it("honours custom thresholds and periods", () => {
    const bars = [...choppy(25, 100), ...moves(100, -4, 4)];
    const z = extremeZones(bars, { rsiPeriod: 5, lower: 40, upper: 60, bbPeriod: 10, bbStdDev: 1.5 });
    expect(z).toHaveLength(bars.length);
    expect(z.at(-1)!.zone).toBe("bottom");
  });

  it("rejects lower >= upper", () => {
    expect(() => extremeZones([], { lower: 70, upper: 30 })).toThrow(InvalidParameterError);
    expect(() => extremeZones([], { lower: 50, upper: 50 })).toThrow(InvalidParameterError);
  });

  it("rejects periods below 1 with a hint", () => {
    expect(() => extremeZones([], { rsiPeriod: 0 })).toThrow(InvalidParameterError);
    expect(() => extremeZones([], { bbPeriod: 0 })).toThrow(InvalidParameterError);
    try {
      extremeZones([], { rsiPeriod: 0 });
    } catch (e) {
      expect((e as InvalidParameterError).hint).toBeTruthy();
    }
  });
});
