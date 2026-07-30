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

export function createEasyMode(vnstock: Vnstock) {
  return {
    quickQuote: async (symbol: string) => {
      const list = await vnstock.stock.trading.priceBoard([symbol]);
      if (list.length === 0) return null;
      var pb = list[0] as any;
      return {
        symbol: pb.symbol,
        companyName: pb.companyName,
        price: pb.price,
        change: pb.percentPriceChange ?? null,
        volume: pb.totalVolume,
        exchange: pb.exchange,
      };
    },

    recentHistory: async (symbol: string, days: number = 30) => {
      var d = new Date();
      d.setDate(d.getDate() - Math.ceil(days * 1.5) - 5);
      var start = d.toISOString().substring(0, 10);
      var rows = await vnstock.stock.quote.history({
        symbols: [symbol],
        start: start,
        timeFrame: "1D",
        countBack: days + 10,
      });
      return rows.slice(-days);
    },

    compareSymbols: async (symbols: string[]) => {
      var list = await vnstock.stock.trading.priceBoard(symbols);
      return list.map(function (pb: any) {
        return {
          symbol: pb.symbol,
          companyName: pb.companyName,
          price: pb.price,
          change: pb.percentPriceChange ?? null,
          volume: pb.totalVolume,
          exchange: pb.exchange,
        };
      });
    },

    topMovers: async () => {
      var pair = await Promise.all([
        vnstock.stock.trading.topGainers(),
        vnstock.stock.trading.topLosers(),
      ]);
      return { gainers: pair[0], losers: pair[1] };
    },
  };
}

export function createCommodityAPI(vnstock: Vnstock) {
  return {
    gold: {
      price: (options?: Parameters<typeof vnstock.commodity.goldPrice>[0]) => vnstock.commodity.goldPrice(options),
      priceBTMC: () => vnstock.commodity.goldPriceBTMC(),
      priceGiaVangNet: () => vnstock.commodity.goldPriceGiaVangNet(),
      priceSJC: () => vnstock.commodity.goldPriceSJC(),
    },
    exchange: (date?: string) => vnstock.commodity.exchangeRates(date),
  };
}
