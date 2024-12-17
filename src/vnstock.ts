import Commodity from "./commodity";
import TCBS from "./tcbs";
import VCI from "./vci";

type STOCK_TYPE = VCI | TCBS;

const STOCK_RECORD: Record<string, STOCK_TYPE> = {
  VCI: new VCI(),
  TCBS: new TCBS(),
};
export class Vnstock {
  stock: STOCK_TYPE;
  commodity: Commodity;

  constructor(source: keyof typeof STOCK_RECORD = "VCI") {
    this.stock = STOCK_RECORD[source];
    this.commodity = new Commodity();
  }
}
