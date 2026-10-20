import { turtleSignals } from "../../src/indicators/turtle";
import { bar, walk, resetClock } from "./helpers";
import { InvalidParameterError } from "../../src/errors";

beforeEach(resetClock);

function sine(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const c = 100 + 10 * Math.sin(i / 8);
    return bar(c, { high: c + 0.5, low: c - 0.5 });
  });
}

describe("turtleSignals", () => {
  it("alternates buy and sell, starting with a buy", () => {
    const s = turtleSignals(sine(300), { trendFilter: false });
    expect(s.length).toBeGreaterThan(2);
    s.forEach((x, i) => expect(x.action).toBe(i % 2 === 0 ? "buy" : "sell"));
  });

  it("sets a fixed ATR stop below the entry", () => {
    const [buy] = turtleSignals(sine(300), { trendFilter: false, stopAtr: 2 });
    expect(buy.stop).toBeLessThan(buy.price);
    expect(buy.reason).toMatch(/^phá đỉnh 20 phiên .+, dừng lỗ .+$/);
  });

  it("sells on the stop when price collapses", () => {
    const bars = [...walk(30, 100, 0.2), bar(115, { high: 115.5 }), bar(80, { low: 79 })];
    const s = turtleSignals(bars, { trendFilter: false, entry: 20, exit: 10 });
    expect(s[s.length - 1]).toMatchObject({ action: "sell", price: 80, reason: expect.stringMatching(/^chạm dừng lỗ/) });
  });

  it("stays out below the trend filter", () => {
    const bars = [...walk(250, 200, -0.2), ...walk(25, 121, 0.3)];
    expect(turtleSignals(bars, { trendFilter: true }).filter((x) => x.action === "buy")).toEqual([]);
  });

  it("buys above the trend filter on a steady uptrend", () => {
    const buys = turtleSignals(walk(260, 50, 0.4), { trendFilter: true }).filter((x) => x.action === "buy");
    expect(buys.length).toBeGreaterThan(0);
  });

  it("buys on the close that clears the prior 20 session high and quotes it in the reason", () => {
    const bars = [...walk(30, 100, 0), bar(103, { high: 103.2 })];
    const s = turtleSignals(bars, { trendFilter: false });
    expect(s).toHaveLength(1);
    expect(s[0]).toMatchObject({ time: bars[30].time, action: "buy", price: 103 });
    expect(s[0].reason).toMatch(/^phá đỉnh 20 phiên 100\.2, dừng lỗ \d+(\.\d+)?$/);
  });

  it("exits on the exit-window low and reports the closed position stop", () => {
    const bars = [...walk(30, 100, 0), bar(103, { high: 103.2 }), ...walk(12, 103, 0.1), bar(100.5, { low: 100.4 })];
    const s = turtleSignals(bars, { trendFilter: false, entry: 20, exit: 10, stopAtr: 10 });
    expect(s.map((x) => x.action)).toEqual(["buy", "sell"]);
    expect(s[1].reason).toMatch(/^thủng đáy 10 phiên .+$/);
    expect(s[1].stop).toBe(s[0].stop);
    expect(s[1].price).toBe(100.5);
  });

  it("does not buy twice while a position is open", () => {
    const s = turtleSignals(walk(120, 100, 0.5), { trendFilter: false });
    expect(s.filter((x) => x.action === "buy")).toHaveLength(1);
    expect(s.filter((x) => x.action === "sell")).toHaveLength(0);
  });

  it("returns no signals for a short or empty series", () => {
    expect(turtleSignals([])).toEqual([]);
    expect(turtleSignals(walk(10, 100, 1), { trendFilter: false })).toEqual([]);
  });

  it("rejects bad windows, stop multiple and periods", () => {
    const bars = sine(60);
    expect(() => turtleSignals(bars, { entry: 1 })).toThrow(InvalidParameterError);
    expect(() => turtleSignals(bars, { exit: 1 })).toThrow(InvalidParameterError);
    expect(() => turtleSignals(bars, { stopAtr: 0 })).toThrow(InvalidParameterError);
    expect(() => turtleSignals(bars, { atrPeriod: 0 })).toThrow(InvalidParameterError);
    expect(() => turtleSignals(bars, { trendPeriod: 0 })).toThrow(InvalidParameterError);
  });

  it("explains a bad option with a hint", () => {
    try {
      turtleSignals(sine(60), { entry: 1 });
      throw new Error("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(InvalidParameterError);
      expect((e as InvalidParameterError).hint).toMatch(/entry/);
    }
  });
});
