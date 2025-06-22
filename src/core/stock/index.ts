import Company from "../../core/stock/company";
import Financials from "../../core/stock/financial";
import Listing from "../../core/stock/listing";
import Quote from "../../core/stock/quote";
import Trading from "../../core/stock/trading";

export default class Stock {
  trading: Trading;
  quote: Quote;
  listing: Listing;
  financials: Financials;
  company: Company;

  constructor(ticker?: string) {
    this.trading = new Trading();
    this.quote = new Quote();
    this.listing = new Listing();
    this.financials = new Financials();
    this.company = new Company(ticker || "VCI");
  }
}
