import { findSimilar } from "../../src/compute/analog";
import { Bar } from "../../src/types";

// A 40-session cycle: sessions in the same phase share every indicator once the averages settle.
function cycle(n: number): Bar[] {
  return Array.from({ length: n }, (_, i) => {
    const c = 100 + 10 * Math.sin((2 * Math.PI * i) / 40);
    return {
      time: new Date(Date.UTC(2024, 0, 1) + i * 86400000).toISOString().substring(0, 10),
      open: c,
      high: c + 0.5,
      low: c - 0.5,
      close: c,
      volume: Math.round(1000 + 500 * Math.sin((2 * Math.PI * i) / 40 + 1)),
      value: null,
    };
  });
}

describe("findSimilar", () => {
  const bars = cycle(600);
  const indexOf = new Map(bars.map((b, i) => [b.time, i] as [string, number]));
  const r = findSimilar("FPT", bars, { top: 5 });

  it("finds earlier sessions in the same phase, leaving out the last 20", () => {
    expect(r.symbol).toBe("FPT");
    expect(r.asOf).toBe(bars[599].time);
    expect(r.matches).toHaveLength(5);
    for (const m of r.matches) {
      const i = indexOf.get(m.time) as number;
      expect(i % 40).toBe(599 % 40);
      expect(i).toBeLessThanOrEqual(579);
      expect(m.similarity).toBeGreaterThan(0.99);
    }
  });

  it("measures returns 5, 20 and 60 sessions later in percent, null past the end", () => {
    for (const m of r.matches) {
      const i = indexOf.get(m.time) as number;
      expect(m.ret5).toBeCloseTo((bars[i + 5].close / bars[i].close - 1) * 100, 2);
      expect(m.ret60).toEqual(i + 60 < bars.length ? expect.any(Number) : null);
    }
    const with60 = r.matches.filter((m) => m.ret60 !== null);
    expect(r.summary.ret60.count).toBe(with60.length);
    expect(r.summary.ret5.count).toBe(5);
  });

  it("needs a year of sessions and a sane top", () => {
    expect(() => findSimilar("FPT", cycle(200))).toThrow(expect.objectContaining({ code: "INVALID_PARAMETER", hint: expect.stringContaining("250") }));
    expect(() => findSimilar("FPT", bars, { top: 0 })).toThrow(expect.objectContaining({ code: "INVALID_PARAMETER" }));
  });
});
