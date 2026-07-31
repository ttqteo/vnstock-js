export interface ScreenFilter {
  field: string;
  operator: "<" | ">" | "<=" | ">=" | "=";
  value: number | string;
}

export interface ScreenOptions {
  /** HOSE, HNX or UPCOM. One of exchange or group is required. */
  exchange?: string;
  /** A listing group such as VN30 or HNX30. Takes precedence over exchange. */
  group?: string;
  filters?: ScreenFilter[];
  sortBy?: string;
  order?: "asc" | "desc";
  limit?: number;
  /**
   * Parallel ratio requests. Kept low on purpose: the upstream answers 429 when
   * pushed, and ratios are one request per symbol.
   */
  concurrency?: number;
}

export interface ScreenResult {
  symbol: string;
  companyName: string;
  companyNameEn: string;
  industry: string;
  industryEn: string;
  exchange: string;
  /** Price in nghin VND, matching the rest of the library. */
  price: number;
  priceChange: number;
  changePercent: number;
  volume: number;
  /** Turnover for the session, ty VND. */
  value: number;
  /** Market capitalisation, ty VND. */
  marketCap: number;
  pe: number | null;
  pb: number | null;
  ps: number | null;
  roe: number | null;
  roa: number | null;
  roic: number | null;
  debtToEquity: number | null;
  dividendYield: number | null;
  grossMargin: number | null;
  currentRatio: number | null;
  [key: string]: unknown;
}
