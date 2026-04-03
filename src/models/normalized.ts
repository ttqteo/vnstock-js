
export interface QuoteHistory {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}


export interface PriceBoardItem {
  symbol: string;
  companyName: string;
  companyNameEn: string;
  exchange: string;
  ceilingPrice: number;
  floorPrice: number;
  referencePrice: number;
  price: number;
  matchVolume: number;
  totalVolume: number;
  totalValue: number;
  averagePrice: number;
  highestPrice: number;
  lowestPrice: number;
  foreignBuyVolume: number;
  foreignSellVolume: number;
  bidPrices: { price: number; volume: number }[];
  askPrices: { price: number; volume: number }[];
}

export interface TopStock {
  symbol: string;
  price1DayAgo: number;
  price5DaysAgo: number;
  price20DaysAgo: number;
  exchange: string;
  marketCap: number;
  type: string;
  liquidity: number;
  vn30: boolean;
  hnx30: boolean;
}


export interface CompanyProfile {
  id: string;
  issuedShares: number;
  history: string;
  historyEn: string;
  profile: string;
  profileEn: string;
  industry: string;
  industryEn: string;
  sector: string;
  sectorEn: string;
  subIndustry: string;
  subIndustryEn: string;
}

export interface Shareholder {
  id: string;
  symbol: string;
  name: string;
  nameEn: string;
  quantity: number;
  percentage: number;
  updatedAt: string;
}

export interface Officer {
  id: string;
  symbol: string;
  name: string;
  position: string;
  positionEn: string;
  positionShort: string;
  positionShortEn: string;
  updatedAt: string;
  ownership: number;
  quantity: number;
}

export interface CorporateEvent {
  id: string;
  companyCode: string;
  symbol: string;
  title: string;
  titleEn: string;
  publishedAt: string;
  issuedAt: string;
  sourceUrl: string;
  eventType: string;
  eventTypeName: string;
  eventTypeNameEn: string;
  ratio: number | null;
  value: number | null;
  recordDate: string;
  exRightDate: string;
}

export interface StockNews {
  id: string;
  symbol: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  sourceUrl: string;
  publishedAt: string;
  summary: string;
  content: string;
  closePrice: number;
  referencePrice: number;
  priceChangePercent: number;
}

export interface Subsidiary {
  id: string;
  companyCode: string;
  subsidiaryCode: string;
  ownership: number;
  companyName: string;
  companyNameEn: string;
}

export interface Affiliate {
  id: string;
  companyCode: string;
  affiliateCode: string;
  ownership: number | null;
  companyName: string;
  companyNameEn: string;
}

export interface AnalysisReport {
  date: string;
  description: string;
  link: string;
  name: string;
}


export interface FinancialStatement {
  symbol: string;
  year: number;
  quarter: number;
  updatedAt: string;
  revenue?: number;
  grossProfit?: number;
  netIncome?: number;
  totalAssets?: number;
  totalEquity?: number;
  totalDebt?: number;
  operatingCashFlow?: number;
  [key: string]: unknown;
}


export interface ListedSymbol {
  id: number;
  symbol: string;
  type: string;
  exchange: string;
  companyName: string;
  companyNameEn: string;
  companyShortName: string;
  companyShortNameEn: string;
}

export interface IndustryInfo {
  symbol: string;
  companyName: string;
  companyNameEn: string;
  industry: string;
  industryEn: string;
  sector: string;
  sectorEn: string;
  subIndustry: string;
  subIndustryEn: string;
  companyType: string;
  icbCode1: string;
  icbCode2: string;
  icbCode3: string;
  icbCode4: string;
}

export interface IndustryClassification {
  code: string;
  level: string;
  name: string;
  nameEn: string;
}


export interface GoldPriceBtmc {
  name: string;
  karat: string;
  weight: string;
  buyPrice: string;
  sellPrice: string;
  worldPrice: string;
  updatedAt: string;
}

export interface GoldPriceSjc {
  id: number;
  type: string;
  branch: string;
  buyPrice: number;
  sellPrice: number;
  buyChange: number;
  sellChange: number;
}

export interface ExchangeRate {
  currencyCode: string;
  currencyName: string;
  buyCash: string;
  buyTransfer: string;
  sell: string;
}


export interface RealtimeQuote {
  exchange: string;
  symbol: string;
  bidPrices: { price: number; volume: number }[];
  askPrices: { price: number; volume: number }[];
  matched: { price: number; volume: number; change: number; changePercent: number };
  totalBuyVolume: number;
  totalBuyValue: number;
  totalVolume: number;
  totalValue: number;
  side: "buy" | "sell";
  lastUpdated: number;
}

export interface SymbolInfo {
  symbol: string;
  companyName: string;
  companyNameEn: string;
  exchange: string;
  industry: string;
  industryEn: string;
  sector: string;
  sectorEn: string;
  icbCode: string;
  vn30: boolean;
}

export interface TradingSession {
  exchange: string;
  morning: { open: string; close: string };
  afternoon: { open: string; close: string };
  ato: string;
  atc: string;
}
