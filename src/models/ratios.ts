/**
 * Fundamentals that only move when a company reports, which is quarterly.
 *
 * PE, PB, PS and market cap are absent on purpose: they are derived from the
 * live price, so a prebuilt copy of them is stale the next session. Screening
 * fetches those per symbol instead.
 */
export interface SymbolRatios {
  symbol: string;
  /** Reporting period the figures come from, e.g. "2026Q2". */
  period: string;
  roe: number | null;
  roa: number | null;
  roic: number | null;
  grossMargin: number | null;
  ebitMargin: number | null;
  currentRatio: number | null;
  quickRatio: number | null;
  debtToEquity: number | null;
  dividendYield: number | null;
  /** Shares used for market cap, needed to derive per-share figures. */
  shares: number | null;
}

export interface RatiosFile {
  /** ISO date the file was generated. */
  generatedAt: string;
  count: number;
  ratios: SymbolRatios[];
}
