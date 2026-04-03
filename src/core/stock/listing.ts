import { ListedSymbol, IndustryInfo, IndustryClassification } from "../../models/normalized";
import { GROUP_CODE } from "../../shared/constants";
import { InvalidParameterError } from "../../errors";
import { StockDataAdapter } from "../../adapters/types";

export default class Listing {
  private adapter: StockDataAdapter;

  constructor(adapter: StockDataAdapter) {
    this.adapter = adapter;
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
