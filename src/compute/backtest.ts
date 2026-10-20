import { Bar } from "../types";
import { InvalidParameterError } from "../errors";

/**
 * Called once per session with the bars up to and including it, so it cannot see ahead. Truthy
 * means a signal; a string also tags the trade for `byTag` stats.
 */
export type Signal = (bars: Bar[]) => boolean | string | null | undefined;

export interface BacktestOptions {
  /** Take-profit in percent above the entry: 7 means +7%. */
  tp: number;
  /** Stop-loss in percent below the entry: 4 means -4%. */
  sl: number;
  /** Sessions held at most, the entry session included. */
  hold: number;
  /** Count every signal, also while a trade in the same symbol is open. Default false. */
  overlap?: boolean;
}

export interface Trade {
  symbol: string;
  signalTime: string;
  /** The string the signal returned, null for `true`. */
  tag: string | null;
  entryTime: string;
  /** Open of the session after the signal, in dong. */
  entry: number;
  exitTime: string;
  exit: number;
  outcome: "tp" | "sl" | "timeout";
  /** Percent: 6.82 means +6.82%. */
  ret: number;
  /** Sessions held, the entry session included. */
  held: number;
}

export interface BacktestStats {
  trades: number;
  /** Trades with ret above 0. */
  wins: number;
  /** wins / trades as a fraction; null without trades. */
  winRate: number | null;
  /** Percent. */
  avgRet: number | null;
  medianRet: number | null;
  best: number | null;
  worst: number | null;
  tp: number;
  sl: number;
  timeout: number;
  avgHeld: number | null;
}

export interface BacktestResult {
  /** Oldest signal first. */
  trades: Trade[];
  stats: { all: BacktestStats; byTag: Record<string, BacktestStats> };
}

/** Rounds to 3 decimals; not a unit change. */
function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Change from `from` to `to` in percent, rounded to 3 decimals; the return measure of both
 * backtest trades and similar() matches.
 * @example
 * pctChange(100, 106.82) // 6.82
 */
export function pctChange(from: number, to: number): number {
  return round3((to / from - 1) * 100);
}

/** Throws InvalidParameterError for a target or stop that is not a percent, or a bad holding period. */
export function checkBacktest(options: BacktestOptions): void {
  const o = options || ({} as BacktestOptions);
  if (!(typeof o.tp === "number" && o.tp > 0)) throw new InvalidParameterError("tp", o.tp, undefined, "tp is a percent above the entry, e.g. 7 for +7%.");
  if (!(typeof o.sl === "number" && o.sl > 0 && o.sl < 100))
    throw new InvalidParameterError("sl", o.sl, undefined, "sl is a percent below the entry between 0 and 100, e.g. 4 for -4%.");
  if (!(Number.isInteger(o.hold) && o.hold >= 1 && o.hold <= 250))
    throw new InvalidParameterError("hold", o.hold, undefined, "hold is a whole number of sessions from 1 to 250.");
}

/**
 * Event study on daily bars: each signal enters at the next open and exits at the take-profit,
 * the stop-loss (assumed first when one session touches both) or the close after `hold` sessions.
 * A session that opens past a level exits at the open. Signals without `hold` sessions after them
 * are skipped. No fees, slippage or price limits.
 * @example
 * runBacktest("FPT", bars, (b) => b[b.length - 1].close > b[b.length - 2].high, { tp: 7, sl: 4, hold: 10 })
 */
export function runBacktest(symbol: string, bars: Bar[], signal: Signal, options: BacktestOptions): Trade[] {
  checkBacktest(options);
  const { tp, sl, hold, overlap = false } = options;
  const trades: Trade[] = [];
  let busyUntil = -1;
  for (let i = 0; i + hold < bars.length; i++) {
    if (!overlap && i < busyUntil) continue;
    const s = signal(bars.slice(0, i + 1));
    if (!s) continue;

    const entry = bars[i + 1].open;
    // Rounded so a high of exactly 105 reaches a 5% target on 100 (100 * 1.05 is 105.00000000000001).
    const tpPrice = round3(entry * (1 + tp / 100));
    const slPrice = round3(entry * (1 - sl / 100));
    let k = i + 1;
    let exit = 0;
    let outcome: Trade["outcome"] = "timeout";
    for (; k <= i + hold; k++) {
      const bar = bars[k];
      if (bar.low <= slPrice) {
        exit = Math.min(bar.open, slPrice);
        outcome = "sl";
        break;
      }
      if (bar.high >= tpPrice) {
        exit = Math.max(bar.open, tpPrice);
        outcome = "tp";
        break;
      }
    }
    if (outcome === "timeout") {
      k = i + hold;
      exit = bars[k].close;
    }
    trades.push({
      symbol,
      signalTime: bars[i].time,
      tag: typeof s === "string" ? s : null,
      entryTime: bars[i + 1].time,
      entry,
      exitTime: bars[k].time,
      exit: round3(exit),
      outcome,
      ret: pctChange(entry, exit),
      held: k - i,
    });
    busyUntil = k;
  }
  return trades;
}

function stats(trades: Trade[]): BacktestStats {
  const n = trades.length;
  const rets = trades.map((t) => t.ret).sort((a, b) => a - b);
  const wins = rets.filter((r) => r > 0).length;
  const mid = Math.floor(n / 2);
  const sum = (xs: number[]) => xs.reduce((a, x) => a + x, 0);
  return {
    trades: n,
    wins,
    winRate: n ? round3(wins / n) : null,
    avgRet: n ? round3(sum(rets) / n) : null,
    medianRet: n ? round3(n % 2 ? rets[mid] : (rets[mid - 1] + rets[mid]) / 2) : null,
    best: n ? rets[n - 1] : null,
    worst: n ? rets[0] : null,
    tp: trades.filter((t) => t.outcome === "tp").length,
    sl: trades.filter((t) => t.outcome === "sl").length,
    timeout: trades.filter((t) => t.outcome === "timeout").length,
    avgHeld: n ? round3(sum(trades.map((t) => t.held)) / n) : null,
  };
}

/**
 * Stats over all trades and per tag.
 * @example
 * summarize(trades).all.winRate
 */
export function summarize(trades: Trade[]): { all: BacktestStats; byTag: Record<string, BacktestStats> } {
  const groups: Record<string, Trade[]> = {};
  for (const t of trades) if (t.tag !== null) (groups[t.tag] = groups[t.tag] || []).push(t);
  const byTag: Record<string, BacktestStats> = {};
  for (const tag of Object.keys(groups)) byTag[tag] = stats(groups[tag]);
  return { all: stats(trades), byTag };
}
