import Trading from "./trading";
import Quote from "./quote";
import Listing from "./listing";
import Financials from "./financial";
import { Company } from "./company";
import Screening from "./screening";
import { StockDataAdapter } from "../../adapters/types";
import { VciAdapter } from "../../adapters/vci";
import { buildAIContext, formatAIPrompt, AIContext } from "./ai-context";
import { fetchSymbolForeignFlow } from "../market/market";
import { ForeignFlow } from "../../models/market";

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
    this.screening = new Screening(this.adapter);
  }

  company(ticker: string): Company {
    return new Company(ticker, this.adapter);
  }

  aiContext(
    symbol: string,
    options: { lookback?: number; asOf?: string } = {}
  ): Promise<AIContext> {
    return buildAIContext(this.adapter, symbol, options);
  }

  async toAIPrompt(
    symbol: string,
    options: { lookback?: number; lang?: "vi" | "en"; asOf?: string } = {}
  ): Promise<string> {
    const ctx = await buildAIContext(this.adapter, symbol, options);
    return formatAIPrompt(ctx, options.lang ?? "vi");
  }

  /** Current-session foreign buy/sell for one symbol, valued in ty VND. */
  foreignFlow(symbol: string): Promise<ForeignFlow> {
    return fetchSymbolForeignFlow(this.adapter, symbol);
  }
}
