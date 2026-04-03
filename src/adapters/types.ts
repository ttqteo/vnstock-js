import {
  QuoteHistory, PriceBoardItem, TopStock, ListedSymbol,
  IndustryInfo, IndustryClassification,
} from "../models/normalized";

export interface QuoteHistoryParams {
  symbols: string[];
  start: string;
  end?: string;
  timeFrame: string;
  countBack?: number;
}

export interface FinancialParams {
  symbol: string;
  period?: string;
  lang?: string;
}

export interface FinancialResult {
  data: Record<string, unknown>;
  mapping: { ratio: any; unit: any };
}

export interface StockDataAdapter {
  readonly name: string;
  fetchQuoteHistory(params: QuoteHistoryParams): Promise<QuoteHistory[]>;
  fetchPriceBoard(symbols: string[]): Promise<PriceBoardItem[]>;
  fetchTopStocks(timeFrame: string, type: "gainers" | "losers"): Promise<TopStock[]>;
  fetchAllSymbols(): Promise<{ symbol: string; companyName: string }[]>;
  fetchSymbolsByExchange(): Promise<ListedSymbol[]>;
  fetchSymbolsByIndustries(): Promise<IndustryInfo[]>;
  fetchIndustriesIcb(): Promise<IndustryClassification[]>;
  fetchSymbolsByGroup(group: string): Promise<ListedSymbol[]>;
  fetchFinancialReport(params: FinancialParams & { reportKey: string }): Promise<FinancialResult>;
  fetchCompanyOverview(ticker: string, lang: string): Promise<any>;
}
