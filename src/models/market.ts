/**
 * Market-level normalized shapes.
 *
 * Units: every monetary field here is in ty VND (billions), which is how the
 * market is actually discussed ("thanh khoan 20 nghin ty"). That differs from
 * the rest of the library on purpose, so each shape carries a `unit` field
 * rather than leaving callers to guess:
 *   - stock prices        -> nghin VND (raw / 1000)
 *   - indices             -> points, unscaled
 *   - QuoteHistory.value  -> trieu VND
 *   - everything below    -> ty VND
 */

export type MoneyUnit = "tyVND";

export type Exchange = "HOSE" | "HNX" | "UPCOM";

export interface MarketBreadth {
  exchange: Exchange | "ALL";
  date: string;
  advancing: number;
  declining: number;
  unchanged: number;
  ceiling: number;
  floor: number;
  total: number;
  /** advancing / declining. null when nothing declined, to avoid a fake Infinity. */
  advanceDeclineRatio: number | null;
}

export interface MarketLiquidity {
  index: string;
  date: string;
  /** Turnover for the session, ty VND. */
  value: number;
  /** Previous session turnover, null when history is too short. */
  valuePrevious: number | null;
  changePercent: number | null;
  volume: number;
  unit: MoneyUnit;
}

export interface ForeignFlow {
  symbol: string;
  date: string;
  buyVolume: number;
  sellVolume: number;
  netVolume: number;
  /** ty VND, derived from volume x averagePrice. */
  buyValue: number;
  sellValue: number;
  netValue: number;
  unit: MoneyUnit;
}

export interface MarketForeignFlow {
  exchange: Exchange | "ALL";
  date: string;
  buyVolume: number;
  sellVolume: number;
  netVolume: number;
  buyValue: number;
  sellValue: number;
  netValue: number;
  topNetBuy: ForeignFlow[];
  topNetSell: ForeignFlow[];
  unit: MoneyUnit;
}

export interface IndexSnapshot {
  symbol: string;
  date: string;
  /** Index level in points. */
  close: number;
  open: number;
  high: number;
  low: number;
  change: number | null;
  changePercent: number | null;
  volume: number;
}

export interface MarketOverview {
  date: string;
  index: IndexSnapshot;
  liquidity: MarketLiquidity;
  breadth: MarketBreadth;
  foreign: MarketForeignFlow;
}

export type MarketRegime = "trending_up" | "trending_down" | "sideways";

export interface MarketAIContext {
  date: string;
  index: IndexSnapshot;
  regime: MarketRegime;
  rationale: string;
  liquidity: {
    value: number;
    avg20: number;
    /** value / avg20; >1 means heavier than the recent norm. */
    ratio: number;
    signal: "above_average" | "below_average" | "normal";
    unit: MoneyUnit;
  };
  breadth: MarketBreadth | null;
  /**
   * Null whenever the context is built for a past session: the upstream only
   * exposes foreign flow for the current session, and inventing a number for a
   * back-dated request would be worse than admitting the gap.
   */
  foreign: MarketForeignFlow | null;
  /** Set when a field above is null, so callers can explain the gap. */
  notes: string[];
}
