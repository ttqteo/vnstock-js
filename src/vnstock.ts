import Commodity from "./commodity";
import Stock from "./stock";

export class Vnstock {
  stock: Stock;
  commodity: Commodity;

  constructor() {
    this.stock = new Stock();
    this.commodity = new Commodity();
  }
}
