import Trading from "./trading";
import Quote from "./quote";
import Listing from "./listing";
import Financials from "./financial";
import { Company } from "./company";

export default class Stock {
  trading: Trading;
  quote: Quote;
  listing: Listing;
  financials: Financials;

  constructor() {
    this.trading = new Trading();
    this.quote = new Quote();
    this.listing = new Listing();
    this.financials = new Financials();
  }

  company(ticker: string): Company {
    return new Company(ticker);
  }
}
