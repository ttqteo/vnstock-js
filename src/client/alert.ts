import { Bar } from "../types";
import { InvalidParameterError } from "../errors";
import { ictToday } from "../shared/time";
import { Tick, WatchHub, WatchOptions, watchWhenReady, asError, warn } from "./watch";
import { breakoutLevel } from "../compute/signals";

export { breakoutLevel };

export type AlertRule = "breakout" | ((tick: Tick) => boolean);

export interface AlertOptions extends WatchOptions {
  /**
   * "breakout": the price trades above the highest high of the previous `lookback` sessions, once
   * per session. A function: called on every tick, the alert fires when it turns from false to true.
   */
  when: AlertRule;
  /** Sessions that set the breakout level, 2 to 200. Default 20. */
  lookback?: number;
}

export interface AlertEvent {
  symbol: string;
  rule: "breakout" | "custom";
  /** ICT time of the tick that fired. */
  time: string;
  /** In dong. */
  price: number;
  /** The breakout level in dong; null for a custom rule. */
  level: number | null;
  tick: Tick;
}

export type AlertListener = (event: AlertEvent) => void;

/** Throws InvalidParameterError for an unknown rule or a lookback outside 2 to 200. */
export function checkAlert(options: AlertOptions): void {
  const when = options && options.when;
  if (when !== "breakout" && typeof when !== "function") {
    throw new InvalidParameterError("when", when, ["breakout"], "Pass 'breakout' or a function (tick) => boolean.");
  }
  const lb = options.lookback;
  if (lb !== undefined && !(Number.isInteger(lb) && lb >= 2 && lb <= 200)) {
    throw new InvalidParameterError("lookback", lb, undefined, "lookback is a whole number of sessions from 2 to 200 (default 20).");
  }
}

export interface AlertStart {
  symbol: string;
  hub: WatchHub;
  /** The symbol check; nothing is watched until it resolves. */
  ready: Promise<void>;
  /** Daily bars ending today, for the breakout level. */
  dailyBars: () => Promise<Bar[]>;
  now: () => number;
  options: AlertOptions;
  cb: AlertListener;
}

/**
 * Runs an alert on the watch hub and returns the function that stops it. A breakout alert loads
 * its level before watching and reloads it when a tick arrives on a new session.
 * @example
 * const stop = startAlert({ symbol: "FPT", hub, ready, dailyBars, now: Date.now, options: { when: "breakout" }, cb: (e) => console.log(e.price) });
 */
export function startAlert(o: AlertStart): () => void {
  checkAlert(o.options);
  const { when, lookback = 20, ...watchOptions } = o.options;
  const onError = watchOptions.onError || warn;

  if (typeof when === "function") {
    let was = false;
    return watchWhenReady(
      o.hub,
      o.ready,
      [o.symbol],
      (t) => {
        let hit: boolean;
        try {
          hit = when(t) === true;
        } catch (err) {
          onError(asError(err));
          return;
        }
        const fire = hit && !was;
        was = hit;
        if (fire) o.cb({ symbol: t.symbol, rule: "custom", time: t.time, price: t.price, level: null, tick: t });
      },
      watchOptions
    );
  }

  let stopped = false;
  let level: { date: string; value: number } | null = null;
  let loading: string | null = null;
  let pending: Tick | null = null;
  let firedOn = "";

  function check(t: Tick): void {
    if (stopped || !level || firedOn === level.date || !(t.price > level.value)) return;
    firedOn = level.date;
    o.cb({ symbol: t.symbol, rule: "breakout", time: t.time, price: t.price, level: level.value, tick: t });
  }

  async function load(date: string): Promise<void> {
    loading = date;
    try {
      const value = breakoutLevel(await o.dailyBars(), date, lookback);
      if (value === null)
        throw new InvalidParameterError("lookback", lookback, undefined, o.symbol + " has fewer than " + lookback + " sessions before " + date + ".");
      level = { date, value };
    } finally {
      loading = null;
    }
  }

  const ready = o.ready.then(() => load(ictToday(o.now())));
  const stop = watchWhenReady(
    o.hub,
    ready,
    [o.symbol],
    (t) => {
      const date = t.time.substring(0, 10);
      if (level && level.date === date) return check(t);
      // A new session: hold the latest tick until its level is loaded.
      pending = t;
      if (loading === date) return;
      load(date).then(
        () => {
          const p = pending;
          pending = null;
          if (p) check(p);
        },
        (err) => onError(asError(err))
      );
    },
    watchOptions
  );
  return () => {
    stopped = true;
    stop();
  };
}
