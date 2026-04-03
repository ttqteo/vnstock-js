import { QuoteHistory } from "../../pipeline/transform/configs/quote";
import { validateDateFormat, inputValidation } from "../../shared/utils";
import { InvalidParameterError } from "../../errors";
import { StockDataAdapter } from "../../adapters/types";

export default class Quote {
  private adapter: StockDataAdapter;

  constructor(adapter: StockDataAdapter) {
    this.adapter = adapter;
  }

  async history(options: {
    symbols: string[];
    start: string;
    end?: string;
    timeFrame: string;
    countBack?: number;
  }): Promise<QuoteHistory[]> {
    const { symbols, start, end, timeFrame, countBack } = options;

    inputValidation(timeFrame);
    validateDateFormat([start, ...(end ? [end] : [])]);

    if (end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      if (startDate > endDate) {
        throw new InvalidParameterError("start", start, ["must be before end date"]);
      }
    }

    return this.adapter.fetchQuoteHistory({ symbols, start, end, timeFrame, countBack });
  }
}
