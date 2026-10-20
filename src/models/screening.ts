export interface ScreenFilter {
  field: string;
  operator: "<" | ">" | "<=" | ">=" | "=";
  value: number | string;
}

export interface ScreenResult {
  symbol: string;
  companyName: string;
  companyNameEn: string;
  industry: string;
  industryEn: string;
  exchange: string;
  /** Price in dong. */
  price: number;
  priceChange: number;
  changePercent: number;
  volume: number;
  /** Turnover for the session, in dong. */
  value: number;
  /** Market capitalisation, in dong. */
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
