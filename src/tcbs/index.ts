import Listing from "./listing";
import Quote from "./quote";
import Trading from "./trading";

export default class TCBS {
  trading: Trading;
  quote: Quote;
  listing: Listing;

  constructor() {
    this.trading = new Trading();
    this.quote = new Quote();
    this.listing = new Listing();
  }
}
