/** v1 price-board row in thousand dong; kept only for scripts/foreign-snapshot.ts, which stays on v1 types for the master cherry-pick. */
export interface PriceBoardItem {
  symbol: string;
  companyName: string;
  companyNameEn: string;
  exchange: string;
  ceilingPrice: number;
  floorPrice: number;
  referencePrice: number;
  price: number;
  /** Against referencePrice, in thousand VND. 0 before the session's first match. */
  priceChange: number;
  /** Against referencePrice, in percent (-0.862 means -0.862%). */
  changePercent: number;
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
  /** Share of the company, as a fraction: 0.068 is 6.8%. */
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
  /** Share of the company, as a fraction. */
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

export interface FinancialNews {
  id: string;
  source: string;
  title: string;
  summary: string;
  link: string;
  image: string;
  publishedAt: string;
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
