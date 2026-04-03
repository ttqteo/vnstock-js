import { ListedSymbol, IndustryInfo, IndustryClassification, SymbolInfo } from "../../models/normalized";
import { GROUP_CODE } from "../../shared/constants";
import { InvalidParameterError } from "../../errors";
import { StockDataAdapter } from "../../adapters/types";
import { Directory } from "../listing/directory";

export default class Listing {
  private adapter: StockDataAdapter;

  constructor(adapter: StockDataAdapter) {
    this.adapter = adapter;
  }

  search(query: string, options?: { limit?: number }): SymbolInfo[] {
    return Directory.search(query, options);
  }

  getBySymbol(symbol: string): SymbolInfo | null {
    return Directory.getBySymbol(symbol);
  }

  getByExchange(exchange: string): SymbolInfo[] {
    return Directory.getByExchange(exchange);
  }

  getByIndustry(query: string): SymbolInfo[] {
    return Directory.getByIndustry(query);
  }

  allLocal(): SymbolInfo[] {
    return Directory.all();
  }

  async allSymbols(): Promise<{ symbol: string; companyName: string }[]> {
    return this.adapter.fetchAllSymbols();
  }

  async symbolsByExchange(): Promise<ListedSymbol[]> {
    return this.adapter.fetchSymbolsByExchange();
  }

  async symbolsByIndustries(): Promise<IndustryInfo[]> {
    return this.adapter.fetchSymbolsByIndustries();
  }

  async industriesIcb(): Promise<IndustryClassification[]> {
    return this.adapter.fetchIndustriesIcb();
  }

  async symbolsByGroup(group: string = "VN30"): Promise<ListedSymbol[]> {
    if (!GROUP_CODE.includes(group)) {
      throw new InvalidParameterError("group", group, GROUP_CODE);
    }

    return this.adapter.fetchSymbolsByGroup(group);
  }
}
