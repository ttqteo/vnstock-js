import { Vnstock } from "./runtime";
import { realtime } from "./core/realtime";
import { createStockAPI, createCommodityAPI } from "./simple";

const vnstock = new Vnstock();

export const stock = createStockAPI(vnstock);
export const commodity = createCommodityAPI(vnstock);
export * as VnstockTypes from "./models/normalized";
export const VnstockRealtime = realtime;
export { Vnstock };

export default vnstock;
