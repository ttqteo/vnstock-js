import { BookLevel, Quote } from "../types";
import { RealtimeQuote } from "../models/normalized";
import { InvalidParameterError } from "../errors";
import { ictDateTime } from "../shared/time";

/** One price update. Money in dong, changePct in percent. */
export interface Tick {
  symbol: string;
  price: number;
  change: number;
  /** Percent: 0.53 means 0.53%. */
  changePct: number;
  /** Session totals so far. */
  volume: number;
  value: number;
  bids: BookLevel[];
  asks: BookLevel[];
  /** Side of the last match; null when polling, the board does not say. */
  side: "buy" | "sell" | null;
  /** When the tick was received, ICT. */
  time: string;
  source: "stream" | "poll";
}

export interface WatchOptions {
  /**
   * "stream" (default) keeps one WebSocket per client; "poll" asks the price board every
   * `interval` ms, for hosts that cannot hold a socket (serverless functions, browsers behind the proxy).
   */
  mode?: "stream" | "poll";
  /** Poll period in ms, at least 1000. Default 5000. */
  interval?: number;
  /** Connection, request and symbol errors. Default console.warn. */
  onError?: (err: Error) => void;
}

export type TickListener = (tick: Tick) => void;

/** What watch() needs from the realtime client. */
export interface RealtimeLike {
  on(event: string, fn: (arg: any) => void): unknown;
  subscribe(symbols: string[]): void;
  unsubscribe(symbols: string[]): void;
  connect(): void;
  disconnect(): void;
}

export interface WatchHubOptions {
  now: () => number;
  fetchQuotes: (symbols: string[]) => Promise<Quote[]>;
  realtime: () => RealtimeLike;
}

export interface WatchHub {
  /** Starts watching right away; returns the function that stops it. */
  watch(symbols: string[], cb: TickListener, options?: WatchOptions): () => void;
}

/** Rounds to 3 decimals; not a unit change. */
function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function asError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

export function warn(err: Error): void {
  console.warn("vnstock-js watch: " + err.message);
}

function timeOf(now: number): string {
  return ictDateTime(Math.floor(now / 1000));
}

export function tickFromStream(q: RealtimeQuote, now: number): Tick {
  return {
    symbol: q.symbol,
    price: q.matched.price,
    change: q.matched.change,
    // The stream parser gives a fraction; ticks use percent like Quote.changePct.
    changePct: round3(q.matched.changePercent * 100),
    volume: q.totalVolume,
    value: q.totalValue,
    bids: q.bidPrices,
    asks: q.askPrices,
    side: q.side,
    time: timeOf(now),
    source: "stream",
  };
}

export function tickFromQuote(q: Quote, now: number): Tick {
  return {
    symbol: q.symbol,
    price: q.price,
    change: q.change,
    changePct: q.changePct,
    volume: q.volume,
    value: q.value,
    bids: q.bids,
    asks: q.asks,
    side: null,
    time: timeOf(now),
    source: "poll",
  };
}

/** Throws InvalidParameterError for an empty symbol list, a short interval or an unknown mode. */
export function checkWatch(symbols: string[], options: WatchOptions = {}): void {
  if (!Array.isArray(symbols) || symbols.length === 0)
    throw new InvalidParameterError("symbols", symbols, undefined, "Pass at least one symbol, e.g. ['FPT'].");
  if (options.mode !== undefined && options.mode !== "stream" && options.mode !== "poll")
    throw new InvalidParameterError("mode", options.mode, ["stream", "poll"]);
  if (options.interval !== undefined && !(options.interval >= 1000)) {
    throw new InvalidParameterError("interval", options.interval, undefined, "interval is in ms, at least 1000.");
  }
}

/**
 * Watchers of one client. Stream watchers share a single realtime connection, opened with the
 * first and closed with the last; each poll watcher runs its own timer.
 * @example
 * const hub = createWatchHub({ now: Date.now, fetchQuotes, realtime: () => new RealtimeClient() });
 * const stop = hub.watch(["FPT"], (t) => console.log(t.price));
 */
export function createWatchHub(o: WatchHubOptions): WatchHub {
  let rt: RealtimeLike | null = null;
  const listeners = new Map<string, Set<TickListener>>();
  const errorHandlers = new Set<(err: Error) => void>();

  function stream(symbols: string[], cb: TickListener, onError: (err: Error) => void): () => void {
    if (!rt) {
      const client = o.realtime();
      client.on("quote", (q: RealtimeQuote) => {
        const set = listeners.get(q.symbol);
        if (!set) return;
        const tick = tickFromStream(q, o.now());
        for (const fn of Array.from(set)) fn(tick);
      });
      client.on("error", (err: Error) => {
        for (const fn of Array.from(errorHandlers)) fn(asError(err));
      });
      client.connect();
      rt = client;
    }
    // Wrapped so the same callback passed twice still stops independently.
    const fn: TickListener = (t) => cb(t);
    const onErr = (e: Error) => onError(e);
    const added: string[] = [];
    for (const s of symbols) {
      let set = listeners.get(s);
      if (!set) {
        set = new Set();
        listeners.set(s, set);
        added.push(s);
      }
      set.add(fn);
    }
    errorHandlers.add(onErr);
    for (const s of added) rt.subscribe([s]);

    let stopped = false;
    return () => {
      if (stopped) return;
      stopped = true;
      errorHandlers.delete(onErr);
      const gone: string[] = [];
      for (const s of symbols) {
        const set = listeners.get(s);
        if (!set) continue;
        set.delete(fn);
        if (set.size === 0) {
          listeners.delete(s);
          gone.push(s);
        }
      }
      if (!rt) return;
      if (listeners.size === 0) {
        rt.disconnect();
        rt = null;
      } else if (gone.length > 0) {
        rt.unsubscribe(gone);
      }
    };
  }

  function poll(symbols: string[], cb: TickListener, onError: (err: Error) => void, interval: number): () => void {
    const seen = new Map<string, string>();
    let busy = false;
    let stopped = false;
    async function round(): Promise<void> {
      if (busy || stopped) return;
      busy = true;
      try {
        const quotes = await o.fetchQuotes(symbols);
        const now = o.now();
        for (const q of quotes) {
          if (stopped || !q || !q.symbol) continue;
          const key = q.price + "|" + q.volume;
          if (seen.get(q.symbol) === key) continue;
          seen.set(q.symbol, key);
          cb(tickFromQuote(q, now));
        }
      } catch (err) {
        if (!stopped) onError(asError(err));
      } finally {
        busy = false;
      }
    }
    void round();
    const timer = setInterval(() => void round(), interval);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }

  return {
    watch(symbols, cb, options = {}) {
      checkWatch(symbols, options);
      const list = Array.from(new Set(symbols.map((s) => s.toUpperCase())));
      const onError = options.onError || warn;
      return options.mode === "poll" ? poll(list, cb, onError, options.interval ?? 5000) : stream(list, cb, onError);
    },
  };
}

/**
 * Validates options now, starts watching once `ready` (the symbol check) resolves, and sends a
 * failed check or start to onError. The returned stop works before and after the start.
 * @example
 * const stop = watchWhenReady(hub, checkSymbols(["FPT"]), ["FPT"], (t) => console.log(t.price), {});
 */
export function watchWhenReady(hub: WatchHub, ready: Promise<void>, symbols: string[], cb: TickListener, options: WatchOptions): () => void {
  checkWatch(symbols, options);
  const onError = options.onError || warn;
  let stop: (() => void) | null = null;
  let cancelled = false;
  ready.then(
    () => {
      if (cancelled) return;
      try {
        stop = hub.watch(symbols, cb, options);
      } catch (err) {
        onError(asError(err));
      }
    },
    (err) => {
      if (!cancelled) onError(asError(err));
    }
  );
  return () => {
    cancelled = true;
    if (stop) {
      stop();
      stop = null;
    }
  };
}
