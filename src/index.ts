import * as types from "@/models";
import { Vnstock } from "@/runtime";
import { createStockAPI, createCommodityAPI } from "./simple";

const vnstock = new Vnstock();
const stock = createStockAPI(vnstock);
const commodity = createCommodityAPI(vnstock);

export default vnstock;
export { types, Vnstock, stock, commodity, createStockAPI, createCommodityAPI };
