import { PriceBoardItem, TopStock } from "../../models/normalized";
import { inputValidation } from "../../shared/utils";
import { InvalidParameterError } from "../../errors";
import { StockDataAdapter } from "../../adapters/types";

export default class Trading {
  private adapter: StockDataAdapter;

  constructor(adapter: StockDataAdapter) {
    this.adapter = adapter;
  }

  async priceBoard(symbols: string[]): Promise<PriceBoardItem[]> {
    if (!symbols || symbols.length === 0) {
      throw new InvalidParameterError("symbols", symbols || [], ["non-empty array"]);
    }

    return this.adapter.fetchPriceBoard(symbols);
  }

  async topGainers(timeFrame: string = "1D"): Promise<TopStock[]> {
    inputValidation(timeFrame);
    return this.adapter.fetchTopStocks(timeFrame, "gainers");
  }

  async topLosers(timeFrame: string = "1D"): Promise<TopStock[]> {
    inputValidation(timeFrame);
    return this.adapter.fetchTopStocks(timeFrame, "losers");
  }
}
