import { PRESETS, resolveSignal } from "../../src/compute/signals";
import { breakoutLevel } from "../../src/client/alert";
import { Bar } from "../../src/types";

const at = (closes: number[], highs?: number[]): Bar[] =>
  closes.map((c, i) => ({
    time: new Date(Date.UTC(2026, 0, 1) + i * 86400000).toISOString().substring(0, 10),
    open: c,
    high: highs ? highs[i] : c,
    low: c,
    close: c,
    volume: 1000,
    value: null,
  }));

/** Indexes of the sessions a signal fires on, asking it with every prefix like the backtest does. */
function firesOn(bars: Bar[], name: "breakout" | "oversold_bounce" | "ema_cross"): number[] {
  const out: number[] = [];
  for (let i = 0; i < bars.length; i++) if (PRESETS[name](bars.slice(0, i + 1))) out.push(i);
  return out;
}

describe("presets", () => {
  it("breakout fires when the close clears the high of the previous 20 sessions", () => {
    const closes = [...Array(20).fill(99), 101, 100];
    const highs = [...Array(20).fill(100), 101, 100];
    expect(firesOn(at(closes, highs), "breakout")).toEqual([20]);
    expect(breakoutLevel(at(closes, highs), at(closes, highs)[20].time, 20)).toBe(100);
  });

  it("oversold_bounce fires when RSI 14 climbs back over 30", () => {
    const closes = [...Array.from({ length: 30 }, (_, i) => 130 - i), 121, 122];
    expect(firesOn(at(closes), "oversold_bounce")).toEqual([30]);
  });

  it("ema_cross fires once when EMA 20 crosses above EMA 50", () => {
    const closes = [...Array.from({ length: 60 }, (_, i) => 200 - i), ...Array.from({ length: 40 }, (_, i) => 145 + i * 5)];
    const hits = firesOn(at(closes), "ema_cross");
    expect(hits).toHaveLength(1);
    expect(hits[0]).toBeGreaterThan(60);
  });
});

describe("resolveSignal", () => {
  it("takes a function or a preset name and rejects anything else", () => {
    const fn = () => true;
    expect(resolveSignal(fn)).toBe(fn);
    expect(resolveSignal("ema_cross")).toBe(PRESETS.ema_cross);
    expect(() => resolveSignal("macd" as any)).toThrow(expect.objectContaining({ code: "INVALID_PARAMETER" }));
  });
});
