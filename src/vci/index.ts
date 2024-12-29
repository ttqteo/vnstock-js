import Financials from "./financial";
import Listing from "./listing";
import Quote from "./quote";
import Trading from "./trading";

export default class VCI {
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
}
