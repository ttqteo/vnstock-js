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
  pe: number;
  pb: number;
  eps: number;
  roe: number;
  roa: number;
  marketCap: number;
  price: number;
  priceChange: number;
  volume: number;
  exchange: string;
  companyName: string;
  industry: string;
  [key: string]: unknown;
}
