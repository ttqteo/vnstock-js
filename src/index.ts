import { Vnstock } from "./runtime";
import { RealtimeClient, create as createRealtime, parseData } from "./realtime";
import { createStockAPI, createCommodityAPI, createEasyMode } from "./simple";
import { calendar } from "./core/market";
export * as MarketTypes from "./models/market";
import { init } from "./data";
import { Watchlist } from "./watchlist";

const vnstock = new Vnstock();
(vnstock as any).init = init;

export const stock = createStockAPI(vnstock);
export const commodity = createCommodityAPI(vnstock);
/**
 * `market.calendar` is unchanged from earlier versions; the rest is new in
 * v1.5.0 and delegates to the same instance as `vnstock.market`.
 */
export const market = {
  calendar,
  index: vnstock.market.index.bind(vnstock.market),
  liquidity: vnstock.market.liquidity.bind(vnstock.market),
  breadth: vnstock.market.breadth.bind(vnstock.market),
  foreignFlow: vnstock.market.foreignFlow.bind(vnstock.market),
  overview: vnstock.market.overview.bind(vnstock.market),
  aiContext: vnstock.market.aiContext.bind(vnstock.market),
};
export const news = vnstock.news;

const easy = createEasyMode(vnstock);
export const quickQuote = easy.quickQuote;
export const recentHistory = easy.recentHistory;
export const compareSymbols = easy.compareSymbols;
export const topMovers = easy.topMovers;

export const watchlist = new Watchlist();
export { Watchlist };
export type { WatchlistStorage } from "./watchlist/storage";
export * as VnstockTypes from "./models/normalized";
export const realtime = { create: createRealtime, parseData };
export { RealtimeClient };
export { Vnstock };
export { init };
export { sma, ema, rsi, macd, bollinger, atr, superTrend, ichimoku, ichimokuFutureCloud } from "./indicators";

export type { ScreenFilter, ScreenOptions, ScreenResult } from "./models/screening";
export type { StockDataAdapter } from "./adapters/types";
export type { RealtimeClientOptions } from "./realtime/types";
export type { InitOptions } from "./data";
export * from "./errors";

export default vnstock;
