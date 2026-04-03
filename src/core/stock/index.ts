import Trading from "./trading";
import Quote from "./quote";
import Listing from "./listing";
import Financials from "./financial";
import { Company } from "./company";
import Screening from "./screening";
import { StockDataAdapter } from "../../adapters/types";
import { VciAdapter } from "../../adapters/vci";

export default class Stock {
  trading: Trading;
  quote: Quote;
  listing: Listing;
  financials: Financials;
  screening: Screening;

  private adapter: StockDataAdapter;

  constructor(adapter?: StockDataAdapter) {
    this.adapter = adapter || new VciAdapter();
    this.trading = new Trading(this.adapter);
    this.quote = new Quote(this.adapter);
    this.listing = new Listing(this.adapter);
    this.financials = new Financials(this.adapter);
    this.screening = new Screening();
  }

  company(ticker: string): Company {
    return new Company(ticker, this.adapter);
  }
}
