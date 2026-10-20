import { createWatchHub, watchWhenReady, Tick } from "../../src/client/watch";
import { Quote } from "../../src/types";
import { fakeRealtime, realtimeQuote } from "./fake-realtime";

const NOW = Date.parse("2026-10-14T03:00:00Z");

function quote(symbol: string, price: number): Quote {
  return {
    symbol,
    name: symbol,
    nameEn: symbol,
    exchange: "HOSE",
    price,
    change: 1000,
    changePct: 0.794,
    ref: 126000,
    ceiling: 0,
    floor: 0,
    high: 0,
    low: 0,
    avg: price,
    volume: 1000,
    value: 127000000,
    foreignBuyVolume: 0,
    foreignSellVolume: 0,
    matchVolume: 0,
    bids: [],
    asks: [],
  };
}

describe("stream mode", () => {
  it("shares one connection, routes ticks by symbol and closes with the last watcher", () => {
    const rt = fakeRealtime();
    let made = 0;
    const hub = createWatchHub({
      now: () => NOW,
      fetchQuotes: async () => [],
      realtime: () => {
        made++;
        return rt;
      },
    });
    const a: Tick[] = [];
    const b: Tick[] = [];
    const stopA = hub.watch(["fpt"], (t) => a.push(t));
    const stopB = hub.watch(["FPT", "VCB"], (t) => b.push(t));
    expect(made).toBe(1);
    expect(rt.calls).toEqual([["connect"], ["sub", ["FPT"]], ["sub", ["VCB"]]]);

    rt.emit("quote", realtimeQuote("FPT", 76400));
    rt.emit("quote", realtimeQuote("HPG", 27000));
    expect(a).toHaveLength(1);
    expect(b).toHaveLength(1);
    expect(a[0]).toEqual({
      symbol: "FPT",
      price: 76400,
      change: 400,
      changePct: 0.53,
      volume: 3733300,
      value: 286268130000,
      bids: [{ price: 76300, volume: 1000 }],
      asks: [{ price: 76500, volume: 2000 }],
      side: "sell",
      time: "2026-10-14T10:00:00+07:00",
      source: "stream",
    });

    stopB();
    expect(rt.calls.slice(3)).toEqual([["unsub", ["VCB"]]]);
    stopA();
    stopA();
    expect(rt.calls.slice(4)).toEqual([["disconnect"]]);
    hub.watch(["FPT"], () => undefined);
    expect(made).toBe(2);
  });

  it("sends connection errors to the active watchers only", () => {
    const rt = fakeRealtime();
    const hub = createWatchHub({ now: () => NOW, fetchQuotes: async () => [], realtime: () => rt });
    const errs: string[] = [];
    const stop = hub.watch(["FPT"], () => undefined, { onError: (e) => errs.push(e.message) });
    rt.emit("error", new Error("Max reconnect attempts reached"));
    stop();
    rt.emit("error", new Error("late"));
    expect(errs).toEqual(["Max reconnect attempts reached"]);
  });
});

describe("poll mode", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("asks the board every interval and emits only changes", async () => {
    let price = 127000;
    let fail = false;
    const asked: string[][] = [];
    const hub = createWatchHub({
      now: () => NOW,
      realtime: () => {
        throw new Error("no stream in poll mode");
      },
      fetchQuotes: async (symbols) => {
        asked.push(symbols);
        if (fail) throw new Error("board down");
        return symbols.map((s) => quote(s, price));
      },
    });
    const ticks: Tick[] = [];
    const errs: string[] = [];
    const stop = hub.watch(["FPT"], (t) => ticks.push(t), { mode: "poll", interval: 5000, onError: (e) => errs.push(e.message) });

    await jest.advanceTimersByTimeAsync(0);
    expect(ticks).toHaveLength(1);
    await jest.advanceTimersByTimeAsync(5000);
    expect(asked).toHaveLength(2);
    expect(ticks).toHaveLength(1);

    price = 127500;
    await jest.advanceTimersByTimeAsync(5000);
    expect(ticks.map((t) => t.price)).toEqual([127000, 127500]);
    expect(ticks[1]).toMatchObject({ symbol: "FPT", changePct: 0.794, side: null, source: "poll" });

    fail = true;
    await jest.advanceTimersByTimeAsync(5000);
    expect(errs).toEqual(["board down"]);

    stop();
    await jest.advanceTimersByTimeAsync(20000);
    expect(asked).toHaveLength(4);
  });
});

describe("options", () => {
  it("rejects an empty list, a short interval and an unknown mode", () => {
    const hub = createWatchHub({ now: () => NOW, fetchQuotes: async () => [], realtime: () => fakeRealtime() });
    const caught = (fn: () => void): unknown => {
      try {
        fn();
      } catch (err) {
        return err;
      }
      return undefined;
    };
    expect(caught(() => hub.watch([], () => undefined))).toMatchObject({ code: "INVALID_PARAMETER" });
    expect(caught(() => hub.watch(["FPT"], () => undefined, { mode: "poll", interval: 500 }))).toMatchObject({ hint: expect.stringContaining("1000") });
    expect(caught(() => hub.watch(["FPT"], () => undefined, { mode: "ws" as any }))).toMatchObject({ code: "INVALID_PARAMETER" });
  });
});

describe("watchWhenReady", () => {
  it("starts after the check and reports a failed check to onError", async () => {
    const rt = fakeRealtime();
    const hub = createWatchHub({ now: () => NOW, fetchQuotes: async () => [], realtime: () => rt });
    const errs: string[] = [];
    watchWhenReady(hub, Promise.reject(new Error("unknown symbol")), ["FTP"], () => undefined, { onError: (e) => errs.push(e.message) });
    const stop = watchWhenReady(hub, Promise.resolve(), ["FPT"], () => undefined, {});
    await Promise.resolve();
    await Promise.resolve();
    expect(errs).toEqual(["unknown symbol"]);
    expect(rt.calls).toEqual([["connect"], ["sub", ["FPT"]]]);
    stop();
    expect(rt.calls[rt.calls.length - 1]).toEqual(["disconnect"]);
  });

  it("never starts when stopped before the check resolves", async () => {
    const rt = fakeRealtime();
    const hub = createWatchHub({ now: () => NOW, fetchQuotes: async () => [], realtime: () => rt });
    const stop = watchWhenReady(hub, Promise.resolve(), ["FPT"], () => undefined, {});
    stop();
    await Promise.resolve();
    await Promise.resolve();
    expect(rt.calls).toEqual([]);
  });
});
