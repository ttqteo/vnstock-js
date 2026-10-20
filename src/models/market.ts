/**
 * Market-level shapes without money: breadth counts, index levels in points and regimes.
 * Money-valued market shapes live in src/client/market.ts, in dong.
 */

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

export type MarketRegime = "trending_up" | "trending_down" | "sideways";
