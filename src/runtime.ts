import Commodity from "./core/commodity";
import Stock from "./core/stock";

export class Vnstock {
  stock: Stock;
  commodity: Commodity;

  constructor() {
    this.stock = new Stock();
    this.commodity = new Commodity();
  }
}
