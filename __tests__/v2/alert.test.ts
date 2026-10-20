import { breakoutLevel, checkAlert, startAlert, AlertEvent } from "../../src/client/alert";
import { createWatchHub } from "../../src/client/watch";
import { Bar } from "../../src/types";
import { fakeRealtime, realtimeQuote } from "./fake-realtime";

const day = (time: string, high: number): Bar => ({ time, open: high, high, low: high, close: high, volume: 100, value: null });
const flush = () => new Promise((r) => setImmediate(r));

function setup(bars: () => Bar[]) {
  const rt = fakeRealtime();
  const clock = { t: Date.parse("2026-10-14T03:00:00Z") };
  const hub = createWatchHub({ now: () => clock.t, fetchQuotes: async () => [], realtime: () => rt });
  let loads = 0;
  const dailyBars = async () => {
    loads++;
    return bars();
  };
  return { rt, clock, hub, dailyBars, loads: () => loads, now: () => clock.t };
}

describe("breakoutLevel", () => {
  it("takes the highest high of the sessions before the date", () => {
    const bars = [day("2026-10-12", 126000), day("2026-10-13", 125000), day("2026-10-14", 130000)];
    expect(breakoutLevel(bars, "2026-10-14", 2)).toBe(126000);
    expect(breakoutLevel(bars, "2026-10-14", 3)).toBeNull();
  });
});

describe("breakout alert", () => {
  it("fires once per session above the previous sessions' high and reloads the level on a new session", async () => {
    let bars = [day("2026-10-12", 126000), day("2026-10-13", 126500), day("2026-10-14", 130000)];
    const s = setup(() => bars);
    const events: AlertEvent[] = [];
    startAlert({
      symbol: "FPT",
      hub: s.hub,
      ready: Promise.resolve(),
      dailyBars: s.dailyBars,
      now: s.now,
      options: { when: "breakout", lookback: 2 },
      cb: (e) => events.push(e),
    });
    await flush();
    for (const p of [126000, 127000, 128000]) s.rt.emit("quote", realtimeQuote("FPT", p));
    expect(events.map((e) => [e.rule, e.price, e.level])).toEqual([["breakout", 127000, 126500]]);
    expect(events[0].time).toBe("2026-10-14T10:00:00+07:00");

    s.clock.t = Date.parse("2026-10-15T03:00:00Z");
    bars = [bars[0], bars[1], day("2026-10-14", 128000), day("2026-10-15", 128000)];
    s.rt.emit("quote", realtimeQuote("FPT", 129000));
    await flush();
    expect(s.loads()).toBe(2);
    expect(events.map((e) => [e.time.substring(0, 10), e.price, e.level])).toEqual([
      ["2026-10-14", 127000, 126500],
      ["2026-10-15", 129000, 128000],
    ]);
  });

  it("reports too short a history to onError and never watches", async () => {
    const s = setup(() => [day("2026-10-13", 1)]);
    const errs: any[] = [];
    startAlert({
      symbol: "FPT",
      hub: s.hub,
      ready: Promise.resolve(),
      dailyBars: s.dailyBars,
      now: s.now,
      options: { when: "breakout", onError: (e) => errs.push(e) },
      cb: () => undefined,
    });
    await flush();
    expect(errs[0]).toMatchObject({ code: "INVALID_PARAMETER", hint: expect.stringContaining("fewer than 20") });
    expect(s.rt.calls).toEqual([]);
  });
});

describe("custom alert", () => {
  it("fires when the rule turns true and sends a throwing rule to onError", async () => {
    const s = setup(() => []);
    const events: AlertEvent[] = [];
    const errs: string[] = [];
    const when = (t: { price: number }) => {
      if (t.price === 0) throw new Error("bad tick");
      return t.price >= 127000;
    };
    const stop = startAlert({
      symbol: "FPT",
      hub: s.hub,
      ready: Promise.resolve(),
      dailyBars: s.dailyBars,
      now: s.now,
      options: { when, onError: (e) => errs.push(e.message) },
      cb: (e) => events.push(e),
    });
    await flush();
    for (const p of [126000, 127000, 128000, 126000, 0, 127500]) s.rt.emit("quote", realtimeQuote("FPT", p));
    expect(events.map((e) => [e.rule, e.price, e.level])).toEqual([
      ["custom", 127000, null],
      ["custom", 127500, null],
    ]);
    expect(errs).toEqual(["bad tick"]);
    expect(s.loads()).toBe(0);
    stop();
    expect(s.rt.calls[s.rt.calls.length - 1]).toEqual(["disconnect"]);
  });
});

describe("checkAlert", () => {
  it("rejects an unknown rule and a lookback out of range", () => {
    const caught = (fn: () => void): unknown => {
      try {
        fn();
      } catch (err) {
        return err;
      }
      return undefined;
    };
    expect(caught(() => checkAlert({ when: "cross" as any }))).toMatchObject({ code: "INVALID_PARAMETER" });
    expect(caught(() => checkAlert({ when: "breakout", lookback: 1 }))).toMatchObject({ hint: expect.stringContaining("2 to 200") });
    expect(caught(() => checkAlert({ when: "breakout", lookback: 20 }))).toBeUndefined();
  });
});
