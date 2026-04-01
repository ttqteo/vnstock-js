import Stock from "./core/stock";
import Commodity from "./core/commodity";
import realtime from "./core/realtime";

export class Vnstock {
  stock: Stock;
  commodity: Commodity;
  realtime: typeof realtime;

  constructor() {
    this.stock = new Stock();
    this.commodity = new Commodity();
    this.realtime = realtime;
  }
}
