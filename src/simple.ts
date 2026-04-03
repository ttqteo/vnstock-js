import { Vnstock } from "./runtime";
import { INDEX_SYMBOLS } from "./shared/constants";
import { InvalidParameterError } from "./errors";

export function createStockAPI(vnstock: Vnstock) {
  return {
    quote: (options: { ticker: string; start: string; end?: string }) =>
      vnstock.stock.quote.history({
        symbols: [options.ticker],
        start: options.start,
        end: options.end,
        timeFrame: "1D",
      }),

    index: (options: { index: string; start: string; end?: string }) => {
      if (!INDEX_SYMBOLS.includes(options.index)) {
        throw new InvalidParameterError("index", options.index, INDEX_SYMBOLS);
      }
      return vnstock.stock.quote.history({
        symbols: [options.index],
        start: options.start,
        end: options.end,
        timeFrame: "1D",
      });
    },

    priceBoard: (options: { ticker: string }) =>
      vnstock.stock.trading.priceBoard([options.ticker]),

    topGainers: () => vnstock.stock.trading.topGainers(),
    topLosers: () => vnstock.stock.trading.topLosers(),

    company: (options: { ticker: string }) =>
      vnstock.stock.company(options.ticker),

    financials: (options: { ticker: string; period?: string }) =>
      vnstock.stock.financials.balanceSheet({
        symbol: options.ticker,
        period: options.period,
      }),

    screening: (options?: {
      exchange?: string;
      filters?: { field: string; operator: string; value: number | string }[];
      sortBy?: string;
      order?: "asc" | "desc";
      limit?: number;
    }) => vnstock.stock.screening.screen(options as any),

    search: (query: string, options?: { limit?: number }) =>
      vnstock.stock.listing.search(query, options),
  };
}

export function createCommodityAPI(vnstock: Vnstock) {
  return {
    gold: {
      priceBTMC: () => vnstock.commodity.goldPriceBTMC(),
      priceGiaVangNet: () => vnstock.commodity.goldPriceGiaVangNet(),
      priceSJC: () => vnstock.commodity.goldPriceSJC(),
    },
    exchange: (date?: string) => vnstock.commodity.exchangeRates(date),
  };
}
