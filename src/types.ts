export type Interval = "1m" | "5m" | "15m" | "30m" | "1h" | "1d" | "1w" | "1mo";
export type Range = "1d" | "5d" | "1mo" | "3mo" | "6mo" | "ytd" | "1y" | "2y" | "5y" | "max";
export type Exchange = "HOSE" | "HNX" | "UPCOM";

/** One candle. Money in dong, indices in points. `time` is YYYY-MM-DD for daily and longer bars, ISO with +07:00 for intraday. */
export interface Bar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  /**
   * Turnover in dong, null when the source has none. Daily and longer bars hold their own turnover;
   * intraday bars hold the session total up to the bar, as VCI sends it.
   */
  value: number | null;
}

export interface BookLevel {
  price: number;
  volume: number;
}

/** Live price-board row. Every price and value is in dong. */
export interface Quote {
  symbol: string;
  name: string;
  nameEn: string;
  exchange: string;
  price: number;
  /** Against the reference price; 0 before the first match. */
  change: number;
  /** Percent number: 0.96 means 0.96%. */
  changePct: number;
  ref: number;
  ceiling: number;
  floor: number;
  high: number;
  low: number;
  avg: number;
  /** Session total. */
  volume: number;
  value: number;
  /** Volume of the last match; 0 before the first. */
  matchVolume: number;
  foreignBuyVolume: number;
  foreignSellVolume: number;
  bids: BookLevel[];
  asks: BookLevel[];
}
