import { createClient } from "./client";

/** Default client: no proxy, in-memory caches. Use createClient() to configure. */
export const vn = createClient();
export { createClient };
export type { Client, ClientOptions } from "./client";
export { memoryStorage } from "./storage";
export type { Storage } from "./storage";
export type { Bar, Quote, BookLevel, Interval, Range, Exchange } from "./types";
export type { Position, PortfolioInput, PortfolioSummary, ValuedPosition, PortfolioTotals } from "./compute/portfolio";
export type { Tick, WatchOptions } from "./client/watch";
export type { AlertOptions, AlertEvent, AlertRule } from "./client/alert";
export type { Signal, BacktestOptions, BacktestResult, BacktestStats, Trade } from "./compute/backtest";
export type { PresetName } from "./compute/signals";
export type { SimilarOptions, SimilarResult, SimilarMatch, Fingerprint, ForwardStats } from "./compute/analog";
export type {
  ForeignFlow,
  MarketForeignFlow,
  MarketForeignDay,
  IntradayPoint,
  MarketIntraday,
  MarketOverview,
  MarketContext,
  MarketLiquidity,
  MarketBreadth,
  MarketRegime,
  IndexSnapshot,
} from "./client/market";
export type { FinancialNews } from "./client/news";
export type { SymbolInfo } from "./models/normalized";
export * from "./errors";
