import { ListedSymbol, IndustryInfo, IndustryClassification } from "../models/normalized";
import { Bar, Quote } from "../types";

export interface BarsParams {
  symbols: string[];
  /** Inclusive first ICT date, YYYY-MM-DD. */
  from: string;
  /** Inclusive last ICT date, YYYY-MM-DD. */
  to: string;
  frame: "ONE_MINUTE" | "ONE_HOUR" | "ONE_DAY";
  /** Bars to ask for; when set the caller owns the window and nothing is trimmed. */
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
  /** Bars keyed by symbol, prices in dong (indices in points), `time` in ICT. */
  fetchBars(params: BarsParams): Promise<Record<string, Bar[]>>;
  /** Price-board rows in dong. */
  fetchQuotes(symbols: string[]): Promise<Quote[]>;
  fetchAllSymbols(): Promise<{ symbol: string; companyName: string }[]>;
  fetchSymbolsByExchange(): Promise<ListedSymbol[]>;
  fetchSymbolsByIndustries(): Promise<IndustryInfo[]>;
  fetchIndustriesIcb(): Promise<IndustryClassification[]>;
  fetchSymbolsByGroup(group: string): Promise<ListedSymbol[]>;
  fetchFinancialReport(params: FinancialParams & { reportKey: string }): Promise<FinancialResult>;
  fetchCompanyOverview(ticker: string, lang: string): Promise<any>;
}
