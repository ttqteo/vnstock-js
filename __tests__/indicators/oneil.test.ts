import { marketHealth } from "../../src/indicators/oneil";
import { InvalidParameterError } from "../../src/errors";
import { Bar } from "../../src/types";
import { bar, walk, resetClock } from "./helpers";

beforeEach(resetClock);

function last(bars: Bar[]): Bar {
  return bars[bars.length - 1];
}

function correctionThenFtd(day4Gain = 1.64): Bar[] {
  const start = walk(25, 120, -0.8, 1000);
  const low = bar(97, { low: 96.5, volume: 1000 });
  const d1 = bar(97.5, { volume: 900 });
  const d2 = bar(97.8, { volume: 900 });
  const d3 = bar(97.6, { volume: 900 });
  const d4 = bar(97.6 * (1 + day4Gain / 100), { volume: 1500 });
  return [...start, low, d1, d2, d3, d4];
}

function distributionCycles(cycles: number): Bar[] {
  const bars = walk(30, 100, 0.1, 1000);
  let p = last(bars).close;
  for (let k = 0; k < cycles; k++) {
    p = p * 0.995;
    bars.push(bar(p, { volume: 1500 }));
    p = p * 1.006;
    bars.push(bar(p, { volume: 1000 }));
  }
  return bars;
}

describe("marketHealth follow-through day", () => {
  it("confirms an uptrend on a follow-through day", () => {
    const bars = correctionThenFtd();
    const h = marketHealth(bars);
    expect(h.events.filter((e) => e.type === "ftd")).toEqual([{ time: last(bars).time, type: "ftd" }]);
    expect(h.status).toBe("uptrend");
  });

  it("stays in correction without a follow-through day", () => {
    const bars = correctionThenFtd(0.5);
    expect(marketHealth(bars).status).toBe("correction");
  });

  it("ignores a strong day after day 7", () => {
    const start = walk(25, 120, -0.8);
    const bars = [...start, bar(97, { low: 96.5 }), ...Array.from({ length: 7 }, (_, i) => bar(97.2 + i * 0.05, { volume: 900 })), bar(100, { volume: 2000 })];
    const h = marketHealth(bars);
    expect(h.events.some((e) => e.type === "ftd")).toBe(false);
    expect(h.status).toBe("correction");
  });

  it("ignores a strong day before day 4", () => {
    const start = walk(25, 120, -0.8);
    const bars = [
      ...start,
      bar(97, { low: 96.5, volume: 1000 }),
      bar(97.5, { volume: 900 }),
      bar(97.8, { volume: 900 }),
      bar(97.8 * 1.02, { volume: 1500 }),
      bar(99.8, { volume: 900 }),
    ];
    const h = marketHealth(bars);
    expect(h.events.some((e) => e.type === "ftd")).toBe(false);
    expect(h.status).toBe("correction");
  });

  it("requires higher volume than the previous session", () => {
    const bars = correctionThenFtd();
    bars[bars.length - 1] = { ...last(bars), volume: 900 };
    const h = marketHealth(bars);
    expect(h.events.some((e) => e.type === "ftd")).toBe(false);
    expect(h.status).toBe("correction");
  });

  it("counts day 1 from the first up close after the low", () => {
    const start = walk(25, 120, -0.8);
    const bars = [
      ...start,
      bar(97, { low: 96.5, volume: 1000 }),
      bar(97, { volume: 900 }),
      bar(97.1, { volume: 900 }),
      bar(97.05, { volume: 900 }),
      bar(97.4, { volume: 900 }),
      bar(97.45, { volume: 900 }),
      bar(97.5, { volume: 900 }),
      bar(97.55, { volume: 900 }),
      bar(97.55 * 1.02, { volume: 1500 }),
    ];
    const h = marketHealth(bars);
    expect(h.events.filter((e) => e.type === "ftd")).toEqual([{ time: last(bars).time, type: "ftd" }]);
  });

  it("restarts the count when the market undercuts the low", () => {
    const start = walk(25, 120, -0.8);
    const bars = [
      ...start,
      bar(97, { low: 96.5, volume: 1000 }),
      bar(97.5, { volume: 900 }),
      bar(97.8, { volume: 900 }),
      bar(97.2, { low: 96, volume: 900 }),
      bar(97.2 * 1.02, { volume: 1500 }),
      bar(99.2, { volume: 900 }),
      bar(99.3, { volume: 900 }),
      bar(99.25, { volume: 900 }),
      bar(99.25 * 1.015, { volume: 1600 }),
    ];
    const h = marketHealth(bars);
    expect(h.events.filter((e) => e.type === "ftd")).toEqual([{ time: last(bars).time, type: "ftd" }]);
    expect(h.status).toBe("uptrend");
  });

  it("records only the first follow-through day of a rally attempt", () => {
    const bars = correctionThenFtd();
    bars.push(bar(last(bars).close * 1.02, { volume: 2000 }));
    expect(marketHealth(bars).events.filter((e) => e.type === "ftd")).toHaveLength(1);
  });

  it("falls back to correction when a new low follows the follow-through day", () => {
    const bars = correctionThenFtd();
    bars.push(...walk(1, last(bars).close, -3, 1000));
    const h = marketHealth(bars);
    expect(h.events.filter((e) => e.type === "ftd")).toHaveLength(1);
    expect(h.status).toBe("correction");
  });

  it("honors custom follow-through options", () => {
    const bars = correctionThenFtd(1);
    expect(marketHealth(bars).events.some((e) => e.type === "ftd")).toBe(false);
    expect(marketHealth(bars, { ftdGain: 0.9 }).events.some((e) => e.type === "ftd")).toBe(true);
    expect(marketHealth(correctionThenFtd(), { ftdMinDay: 5 }).events.some((e) => e.type === "ftd")).toBe(false);
    expect(marketHealth(correctionThenFtd(), { ftdMinDay: 1, ftdMaxDay: 3 }).events.some((e) => e.type === "ftd")).toBe(false);
  });

  it("does not track a low before lowLookback sessions exist", () => {
    const bars = correctionThenFtd();
    expect(marketHealth(bars, { lowLookback: 30 }).status).toBe("uptrend");
  });
});

describe("marketHealth distribution days", () => {
  it("counts live distribution days and reports pressure at five", () => {
    const bars = distributionCycles(5);
    const h = marketHealth(bars);
    expect(h.distributionCount).toBe(5);
    expect(h.events.filter((e) => e.type === "distribution")).toHaveLength(5);
    expect(h.status).toBe("pressure");
  });

  it("stays in uptrend below the pressure count", () => {
    const h = marketHealth(distributionCycles(4));
    expect(h.distributionCount).toBe(4);
    expect(h.status).toBe("uptrend");
  });

  it("honors pressureCount", () => {
    expect(marketHealth(distributionCycles(2), { pressureCount: 2 }).status).toBe("pressure");
  });

  it("expires a distribution day after a 5% gain", () => {
    const bars = [bar(100, { volume: 1000 }), bar(99.5, { volume: 1200 }), ...walk(5, 99.5, 1.2)];
    const h = marketHealth(bars);
    expect(h.distributionCount).toBe(0);
    expect(h.events.filter((e) => e.type === "distribution")).toHaveLength(1);
  });

  it("keeps a distribution day when the gain stays under 5%", () => {
    const bars = [bar(100, { volume: 1000 }), bar(99.5, { volume: 1200 }), ...walk(5, 99.5, 0.9)];
    expect(marketHealth(bars).distributionCount).toBe(1);
    expect(marketHealth(bars, { expireGain: 3 }).distributionCount).toBe(0);
  });

  it("keeps a distribution day expired after the index falls back", () => {
    const bars = [bar(100, { volume: 1000 }), bar(99.5, { volume: 1200 }), ...walk(5, 99.5, 1.2), bar(99.6, { volume: 800 })];
    expect(marketHealth(bars).distributionCount).toBe(0);
  });

  it("flags a drop of exactly 0.2 percent", () => {
    const bars = [bar(100, { volume: 1000 }), bar(99.8, { volume: 1500 })];
    expect(marketHealth(bars).events).toEqual([{ time: bars[1].time, type: "distribution" }]);
  });

  it("ignores small drops and drops on lighter volume", () => {
    const bars = walk(30, 100, 0.1, 1000);
    const a = last(bars).close * 0.9985;
    bars.push(bar(a, { volume: 2000 }));
    bars.push(bar(a * 0.99, { volume: 1500 }));
    const h = marketHealth(bars);
    expect(h.events).toEqual([]);
    expect(h.distributionCount).toBe(0);
  });

  it("counts only the last window sessions but lists every event", () => {
    const bars = [bar(100, { volume: 1000 }), bar(99.5, { volume: 1500 }), ...walk(30, 99.5, 0.05, 1000)];
    const h = marketHealth(bars);
    expect(h.events.filter((e) => e.type === "distribution")).toHaveLength(1);
    expect(h.distributionCount).toBe(0);
    expect(marketHealth(bars, { window: 40 }).distributionCount).toBe(1);
  });

  it("honors distributionDrop", () => {
    const bars = [bar(100, { volume: 1000 }), bar(99.5, { volume: 1500 })];
    expect(marketHealth(bars, { distributionDrop: 1 }).events).toEqual([]);
    expect(marketHealth(bars, { distributionDrop: 0.5 }).distributionCount).toBe(1);
  });
});

describe("marketHealth events and edge cases", () => {
  it("sorts follow-through and distribution events by time", () => {
    const bars = correctionThenFtd();
    bars.push(bar(last(bars).close * 0.995, { volume: 2000 }));
    const h = marketHealth(bars);
    expect(h.events.map((e) => e.type)).toEqual(["ftd", "distribution"]);
    expect(h.events[0].time < h.events[1].time).toBe(true);
    expect(h.distributionCount).toBe(1);
    expect(h.status).toBe("uptrend");
  });

  it("returns a neutral result without data", () => {
    expect(marketHealth([])).toEqual({ events: [], distributionCount: 0, status: "uptrend" });
    expect(marketHealth([bar(100)])).toEqual({ events: [], distributionCount: 0, status: "uptrend" });
  });

  it("rejects invalid options with a hint", () => {
    const bad: Parameters<typeof marketHealth>[1][] = [
      { window: 0 },
      { window: 2.5 },
      { lowLookback: 0 },
      { ftdMinDay: 0 },
      { ftdMinDay: 5, ftdMaxDay: 4 },
      { pressureCount: 0 },
      { distributionDrop: -1 },
      { ftdGain: -1 },
      { expireGain: -1 },
    ];
    for (const opts of bad) {
      expect(() => marketHealth([], opts)).toThrow(InvalidParameterError);
    }
    try {
      marketHealth([], { window: 0 });
    } catch (e) {
      expect((e as InvalidParameterError).hint).toBeTruthy();
    }
  });
});
