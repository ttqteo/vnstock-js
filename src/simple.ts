import { Vnstock } from "./runtime";
import { INDEX_SYMBOLS } from "./shared/constants";

export const createStockAPI = (vnstock: Vnstock) => ({
  price: (symbol: string, start: string, end?: string) => vnstock.stock.quote.history({ symbols: [symbol], start, end, timeFrame: "1D" }),

  index: (index: string, start: string, end?: string) => {
    if (!INDEX_SYMBOLS.includes(index)) {
      throw new Error(`Invalid index symbol: ${index}`);
    }
    return vnstock.stock.quote.history({ symbols: [index], start, end, timeFrame: "1D" });
  },

  company: (symbol: string) => vnstock.stock.company.overview(),

  financials: (symbol: string, period: "quarter" | "year" = "quarter") => vnstock.stock.financials.balanceSheet({ symbol, period }),
});

export const createCommodityAPI = (vnstock: Vnstock) => ({
  gold: {
    priceBTMC: () => vnstock.commodity.goldPriceBTMC(),
    priceGiaVangNet: () => vnstock.commodity.goldPriceGiaVangNet(),
    priceSJC: () => vnstock.commodity.goldPriceSJC(),
  },
  exchange: (date?: string) => vnstock.commodity.exchangeRates(date),
});
