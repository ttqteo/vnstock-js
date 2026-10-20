import { checkBacktest, runBacktest, summarize, Trade } from "../../src/compute/backtest";
import { Bar } from "../../src/types";

const t = (i: number) => "2026-01-" + String(i).padStart(2, "0");
const b = (i: number, open: number, high: number, low: number, close: number): Bar => ({ time: t(i), open, high, low, close, volume: 1000, value: null });
const flat = (n: number) => Array.from({ length: n }, (_, i) => b(i + 1, 100, 100, 100, 100));
const first = (bars: Bar[]) => bars.length === 1;
const OPTS = { tp: 5, sl: 3, hold: 3 };

function withThird(open: number, high: number, low: number, close: number): Bar[] {
  return [b(1, 100, 100, 100, 100), b(2, 100, 102, 99, 101), b(3, open, high, low, close), b(4, 105, 105, 105, 105), b(5, 105, 105, 105, 105)];
}

describe("runBacktest", () => {
  it("enters at the next open and takes profit at the target", () => {
    expect(runBacktest("FPT", withThird(101, 106, 100, 105), first, OPTS)).toEqual([
      { symbol: "FPT", signalTime: t(1), tag: null, entryTime: t(2), entry: 100, exitTime: t(3), exit: 105, outcome: "tp", ret: 5, held: 2 },
    ]);
  });

  it("counts a high exactly at the target", () => {
    expect(runBacktest("FPT", withThird(101, 105, 100, 104), first, OPTS)[0]).toMatchObject({ outcome: "tp", exit: 105 });
  });

  it("assumes the stop when one session touches both levels", () => {
    expect(runBacktest("FPT", withThird(101, 106, 96, 100), first, OPTS)[0]).toMatchObject({ outcome: "sl", exit: 97, ret: -3 });
  });

  it("exits at the open when it gaps past a level", () => {
    expect(runBacktest("FPT", withThird(95, 96, 94, 95), first, OPTS)[0]).toMatchObject({ outcome: "sl", exit: 95, ret: -5 });
    expect(runBacktest("FPT", withThird(107, 108, 106, 107), first, OPTS)[0]).toMatchObject({ outcome: "tp", exit: 107, ret: 7 });
  });

  it("times out at the close of the last session held", () => {
    const bars = [...flat(3), b(4, 100, 101, 99, 102), b(5, 100, 100, 100, 100)];
    expect(runBacktest("FPT", bars, first, OPTS)[0]).toMatchObject({ outcome: "timeout", exitTime: t(4), exit: 102, ret: 2, held: 3 });
  });

  it("skips signals without a full holding window", () => {
    expect(runBacktest("FPT", flat(5), (bars) => bars.length === 3, OPTS)).toEqual([]);
  });

  it("keeps one open trade per symbol unless overlap is on", () => {
    const always = () => true;
    expect(runBacktest("FPT", flat(8), always, { tp: 5, sl: 5, hold: 2 }).map((x) => x.signalTime)).toEqual([t(1), t(3), t(5)]);
    expect(runBacktest("FPT", flat(8), always, { tp: 5, sl: 5, hold: 2, overlap: true })).toHaveLength(6);
  });

  it("tags trades with the string a signal returns and passes only the bars up to the signal", () => {
    const seen: number[] = [];
    const trades = runBacktest(
      "FPT",
      flat(6),
      (bars) => {
        seen.push(bars.length);
        return bars.length === 1 ? "first" : null;
      },
      { tp: 5, sl: 5, hold: 2 }
    );
    expect(trades.map((x) => x.tag)).toEqual(["first"]);
    // Not asked while the first trade is open, nor where no full holding window is left.
    expect(seen).toEqual([1, 3, 4]);
  });
});

describe("summarize", () => {
  const trade = (ret: number, tag: string | null, outcome: Trade["outcome"], held: number): Trade => ({
    symbol: "FPT",
    signalTime: t(1),
    tag,
    entryTime: t(2),
    entry: 100,
    exitTime: t(3),
    exit: 100 + ret,
    outcome,
    ret,
    held,
  });

  it("gives stats for all trades and per tag", () => {
    const s = summarize([trade(5, "a", "tp", 2), trade(-3, "a", "sl", 1), trade(2, null, "timeout", 3), trade(0, "b", "timeout", 3)]);
    expect(s.all).toEqual({ trades: 4, wins: 2, winRate: 0.5, avgRet: 1, medianRet: 1, best: 5, worst: -3, tp: 1, sl: 1, timeout: 2, avgHeld: 2.25 });
    expect(s.byTag.a).toMatchObject({ trades: 2, wins: 1, avgRet: 1, avgHeld: 1.5 });
    expect(s.byTag.b).toMatchObject({ trades: 1, wins: 0, winRate: 0, timeout: 1 });
    expect(Object.keys(s.byTag).sort()).toEqual(["a", "b"]);
  });

  it("has nulls without trades", () => {
    expect(summarize([])).toEqual({
      all: { trades: 0, wins: 0, winRate: null, avgRet: null, medianRet: null, best: null, worst: null, tp: 0, sl: 0, timeout: 0, avgHeld: null },
      byTag: {},
    });
  });
});

describe("checkBacktest", () => {
  const caught = (fn: () => void): unknown => {
    try {
      fn();
    } catch (err) {
      return err;
    }
    return undefined;
  };

  it("rejects bad targets, stops and holding periods with a hint", () => {
    expect(caught(() => checkBacktest({ tp: 0, sl: 3, hold: 10 }))).toMatchObject({ code: "INVALID_PARAMETER", hint: expect.stringContaining("percent") });
    expect(caught(() => checkBacktest({ tp: 7, sl: 100, hold: 10 }))).toMatchObject({ code: "INVALID_PARAMETER" });
    expect(caught(() => checkBacktest({ tp: 7, sl: 4, hold: 1.5 }))).toMatchObject({ hint: expect.stringContaining("sessions") });
    expect(caught(() => checkBacktest({ tp: 7, sl: 4, hold: 10 }))).toBeUndefined();
  });
});
