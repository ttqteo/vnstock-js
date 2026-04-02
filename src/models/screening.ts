export interface ScreenFilter {
  field: string;
  operator: "<" | ">" | "<=" | ">=" | "=";
  value: number | string;
}

export interface ScreenOptions {
  exchange?: string;
  filters?: ScreenFilter[];
  sortBy?: string;
  order?: "asc" | "desc";
  limit?: number;
}

export interface ScreenResult {
  symbol: string;
  companyName: string;
  companyNameEn: string;
  industry: string;
  industryEn: string;
  exchange: string;
  pe: number;
  pb: number;
  eps: number;
  roe: number;
  roa: number;
  marketCap: number;
  price: number;
  priceChange: number;
  volume: number;
  revenue: number;
  netProfit: number;
  debtToEquity: number;
  [key: string]: unknown;
}
