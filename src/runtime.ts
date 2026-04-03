import { VciAdapter } from "./adapters";
import { StockDataAdapter } from "./adapters/types";
import Stock from "./core/stock";
import Commodity from "./core/commodity";

export class Vnstock {
  stock: Stock;
  commodity: Commodity;

  constructor(adapter?: StockDataAdapter) {
    const stockAdapter = adapter || new VciAdapter();
    this.stock = new Stock(stockAdapter);
    this.commodity = new Commodity();
  }
}
