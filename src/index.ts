import { Vnstock } from "./runtime";
import { realtime } from "./core/realtime";
import { createStockAPI, createCommodityAPI } from "./simple";
import * as NormalizedTypes from "./models/normalized";

const vnstock = new Vnstock();

export const stock = createStockAPI(vnstock);
export const commodity = createCommodityAPI(vnstock);
export const VnstockTypes = NormalizedTypes;
export const VnstockRealtime = realtime;
export { Vnstock };

export default vnstock;
