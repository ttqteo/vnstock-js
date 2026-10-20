import { patternReport } from "../../src/indicators/report";
import { patternReport as exported } from "../../src/indicators";
import { bar, walk, resetClock } from "./helpers";

beforeEach(resetClock);

describe("patternReport", () => {
  it("does not throw on a series shorter than every window and reports nothing", () => {
    const r = patternReport(walk(5, 100, 0.1));
    expect(r.zones).toEqual([]);
    expect(r.extreme).toBeNull();
    expect(r.turtle).toBeNull();
    expect(r.breakouts).toEqual([]);
    expect(Array.isArray(r.candles)).toBe(true);
    expect(patternReport([])).toEqual({ zones: [], extreme: null, candles: [], turtle: null, breakouts: [] });
  });

  it("puts a breakout on the last bar first", () => {
    const base = walk(40, 100, 0.05, 1000).map((b, i) => ({ ...b, volume: i % 2 ? 900 : 1100 }));
    const top = Math.max(...base.slice(-20).map((b) => b.high));
    const bars = [...base, bar(top * 1.05, { high: top * 1.06, volume: 10000 })];
    const r = patternReport(bars);
    expect(r.breakouts[0].time).toBe(bars[bars.length - 1].time);
    expect(r.breakouts[0].direction).toBe("up");
  });

  it("keeps only events from the last `recent` bars, newest first", () => {
    const base = walk(60, 100, 0.05, 1000).map((b, i) => ({ ...b, volume: i % 2 ? 900 : 1100 }));
    const spikeAt = 30;
    base[spikeAt] = { ...base[spikeAt], close: 120, high: 121, volume: 20000 };
    const r = patternReport(base, { recent: 5 });
    const cutoff = base[base.length - 5].time;
    expect(r.breakouts.every((b) => b.time >= cutoff)).toBe(true);
    expect(r.candles.every((c) => c.time >= cutoff)).toBe(true);
    const all = patternReport(base, { recent: 100 }).breakouts.map((b) => b.time);
    expect(all).toEqual([...all].sort().reverse());
  });

  it("is exported from vnstock-js/indicators", () => {
    expect(exported).toBe(patternReport);
  });
});
