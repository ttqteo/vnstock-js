import { Vnstock } from "./runtime";
import { INDEX_SYMBOLS } from "./shared/constants";
import Company from "./core/stock/company";

export const createStockAPI = (vnstock: Vnstock) => ({
  price: (ticker: string, start: string, end?: string) => vnstock.stock.quote.history({ symbols: [ticker], start, end, timeFrame: "1D" }),
  quote: (ticker: string, start: string, end?: string) => vnstock.stock.quote.history({ symbols: [ticker], start, end, timeFrame: "1D" }),

  index: (index: string, start: string, end?: string) => {
    if (!INDEX_SYMBOLS.includes(index)) {
      throw new Error(`Invalid index symbol: ${index}`);
    }
    return vnstock.stock.quote.history({ symbols: [index], start, end, timeFrame: "1D" });
  },

  company: (ticker: string) => {
    vnstock.stock.company = new Company(ticker);
    return vnstock.stock.company.overview();
  },

  financials: (ticker: string, period: "quarter" | "year" = "quarter") => vnstock.stock.financials.balanceSheet({ symbol: ticker, period }),
});

export const createCommodityAPI = (vnstock: Vnstock) => ({
  gold: {
    priceBTMC: () => vnstock.commodity.goldPriceBTMC(),
    priceGiaVangNet: () => vnstock.commodity.goldPriceGiaVangNet(),
    priceSJC: () => vnstock.commodity.goldPriceSJC(),
  },
  exchange: (date?: string) => vnstock.commodity.exchangeRates(date),
});
