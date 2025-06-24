import * as VnstockTypes from "./models";
import * as VnstockRealtime from "./core/realtime";
import { Vnstock } from "./runtime";
import { createStockAPI, createCommodityAPI } from "./simple";

const vnstock = new Vnstock();
const stock = createStockAPI(vnstock);
const commodity = createCommodityAPI(vnstock);

export default vnstock;
export { VnstockTypes, Vnstock, VnstockRealtime, stock, commodity };
