import { Vnstock } from "./runtime";
import { RealtimeClient, create as createRealtime, parseData } from "./realtime";
import { createStockAPI, createCommodityAPI } from "./simple";

const vnstock = new Vnstock();

export const stock = createStockAPI(vnstock);
export const commodity = createCommodityAPI(vnstock);
export * as VnstockTypes from "./models/normalized";
export const realtime = { create: createRealtime, parseData };
export { RealtimeClient };
export { Vnstock };
export { sma, ema, rsi } from "./indicators";

export type { ScreenFilter, ScreenOptions, ScreenResult } from "./models/screening";
export type { StockDataAdapter } from "./adapters/types";
export type { RealtimeClientOptions } from "./realtime/types";
export * from "./errors";

export default vnstock;
