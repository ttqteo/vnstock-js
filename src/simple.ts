import realtime from "./core/realtime";
import Company from "./core/stock/company";
import { Vnstock } from "./runtime";
import { INDEX_SYMBOLS } from "./shared/constants";

export const createStockAPI = (vnstock: Vnstock) => ({
  quote: ({ ticker, start, end }: { ticker: string; start: string; end?: string }) =>
    vnstock.stock.quote.history({ symbols: [ticker], start, end, timeFrame: "1D" }),

  priceBoard: ({ ticker }: { ticker: string }) => vnstock.stock.trading.priceBoard([ticker]),
  topGainers: () => vnstock.stock.trading.topGainers({}),
  topLosers: () => vnstock.stock.trading.topLosers({}),

  index: ({ index, start, end }: { index: string; start: string; end?: string }) => {
    if (!INDEX_SYMBOLS.includes(index)) {
      throw new Error(`Invalid index symbol: ${index}`);
    }
    return vnstock.stock.quote.history({ symbols: [index], start, end, timeFrame: "1D" });
  },

  company: ({ ticker }: { ticker: string }) => {
    vnstock.stock.company = new Company(ticker);
    return vnstock.stock.company.overview();
  },

  financials: ({ ticker, period = "quarter" }: { ticker: string; period?: "quarter" | "year" }) =>
    vnstock.stock.financials.balanceSheet({ symbol: ticker, period }),

  realtime,
});

export const createCommodityAPI = (vnstock: Vnstock) => ({
  gold: {
    priceBTMC: () => vnstock.commodity.goldPriceBTMC(),
    priceGiaVangNet: () => vnstock.commodity.goldPriceGiaVangNet(),
    priceSJC: () => vnstock.commodity.goldPriceSJC(),
  },
  exchange: (date?: string) => vnstock.commodity.exchangeRates(date),
});
