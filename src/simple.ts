import { Vnstock } from "./runtime";
import { INDEX_SYMBOLS } from "./shared/constants";

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
        throw new Error(`Invalid index: ${options.index}. Valid: ${INDEX_SYMBOLS.join(", ")}`);
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

    realtime: vnstock.realtime,
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
