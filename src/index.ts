import { Vnstock } from "./runtime";
import { RealtimeClient, create as createRealtime, parseData } from "./realtime";
import { createStockAPI, createCommodityAPI } from "./simple";
import { calendar } from "./core/market";
import { init } from "./data";

const vnstock = new Vnstock();
(vnstock as any).init = init;

export const stock = createStockAPI(vnstock);
export const commodity = createCommodityAPI(vnstock);
export const market = { calendar };
export * as VnstockTypes from "./models/normalized";
export const realtime = { create: createRealtime, parseData };
export { RealtimeClient };
export { Vnstock };
export { init };
export { sma, ema, rsi } from "./indicators";

export type { ScreenFilter, ScreenOptions, ScreenResult } from "./models/screening";
export type { StockDataAdapter } from "./adapters/types";
export type { RealtimeClientOptions } from "./realtime/types";
export type { InitOptions } from "./data";
export * from "./errors";

export default vnstock;
