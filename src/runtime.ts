import { VciAdapter } from "./adapters";
import { StockDataAdapter } from "./adapters/types";
import Stock from "./core/stock";
import Commodity from "./core/commodity";
import { News } from "./core/news";

export class Vnstock {
  stock: Stock;
  commodity: Commodity;
  news: News;

  constructor(adapter?: StockDataAdapter) {
    const stockAdapter = adapter || new VciAdapter();
    this.stock = new Stock(stockAdapter);
    this.commodity = new Commodity();
    this.news = new News();
  }
}
