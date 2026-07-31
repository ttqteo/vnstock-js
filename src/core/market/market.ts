import { StockDataAdapter } from "../../adapters/types";
import { VciAdapter } from "../../adapters/vci";
import { InvalidParameterError } from "../../errors";
import { PriceBoardItem, QuoteHistory } from "../../models/normalized";
import {
  Exchange,
  ForeignFlow,
  MarketAIContext,
  MarketBreadth,
  MarketForeignFlow,
  MarketLiquidity,
  MarketOverview,
} from "../../models/market";
import { INDEX_SYMBOLS } from "../../shared/constants";
import { asOfToExclusiveEnd, validateDateFormat } from "../../shared/utils";
import { Calendar } from "./calendar";
import {
  averageLiquidity,
  classifyRegime,
  computeBreadth,
  computeLiquidity,
  computeMarketForeignFlow,
  computeSymbolForeignFlow,
  liquiditySignal,
  toIndexSnapshot,
} from "./aggregate";

const EXCHANGES: Exchange[] = ["HOSE", "HNX", "UPCOM"];
const DEFAULT_INDEX = "VNINDEX";

export interface ExchangeOption {
  exchange?: Exchange | "ALL";
}

export default class Market {
  calendar: Calendar;

  private adapter: StockDataAdapter;

  constructor(adapter?: StockDataAdapter) {
    this.adapter = adapter || new VciAdapter();
    this.calendar = new Calendar();
  }

  /**
   * Index history, in points. Indices are not scaled by 1000 the way VND prices
   * are, so this is safe to read as a level.
   */
  async index(
    symbol: string = DEFAULT_INDEX,
    options: { start?: string; asOf?: string; countBack?: number } = {}
  ): Promise<QuoteHistory[]> {
    assertIndexSymbol(symbol);
    if (options.asOf) validateDateFormat([options.asOf]);

    const countBack = options.countBack ?? 260;
    const start = options.start ?? backdate(options.asOf, countBack);

    return this.adapter.fetchQuoteHistory({
      symbols: [symbol],
      start,
      end: options.asOf ? asOfToExclusiveEnd(options.asOf) : undefined,
      timeFrame: "1D",
      countBack,
    });
  }

  async liquidity(
    options: { index?: string; asOf?: string } = {}
  ): Promise<MarketLiquidity> {
    const symbol = options.index ?? DEFAULT_INDEX;
    const bars = await this.index(symbol, { asOf: options.asOf, countBack: 30 });
    return computeLiquidity(bars, symbol);
  }

  async breadth(options: ExchangeOption = {}): Promise<MarketBreadth> {
    const exchange = options.exchange ?? "HOSE";
    const [items, date] = await Promise.all([
      this.priceBoardFor(exchange),
      this.sessionDate(),
    ]);
    return computeBreadth(items, exchange, date);
  }

  async foreignFlow(
    options: ExchangeOption & { top?: number } = {}
  ): Promise<MarketForeignFlow> {
    const exchange = options.exchange ?? "HOSE";
    const [items, date] = await Promise.all([
      this.priceBoardFor(exchange),
      this.sessionDate(),
    ]);
    return computeMarketForeignFlow(items, exchange, date, options.top ?? 10);
  }

  /**
   * One call for the whole picture. Shares a single price board fetch between
   * breadth and foreign flow instead of pulling ~1500 symbols twice.
   */
  async overview(
    options: ExchangeOption & { index?: string; top?: number } = {}
  ): Promise<MarketOverview> {
    const exchange = options.exchange ?? "HOSE";
    const symbol = options.index ?? DEFAULT_INDEX;

    const [bars, items] = await Promise.all([
      this.index(symbol, { countBack: 30 }),
      this.priceBoardFor(exchange),
    ]);

    const snapshot = toIndexSnapshot(bars, symbol);

    return {
      date: snapshot.date,
      index: snapshot,
      liquidity: computeLiquidity(bars, symbol),
      breadth: computeBreadth(items, exchange, snapshot.date),
      foreign: computeMarketForeignFlow(items, exchange, snapshot.date, options.top ?? 10),
    };
  }

  /**
   * Market-level counterpart to stock.aiContext: regime, liquidity against its
   * own 20-session norm, breadth and foreign flow, shaped for an LLM to reason
   * over without re-deriving anything.
   */
  async aiContext(
    options: ExchangeOption & { index?: string; asOf?: string } = {}
  ): Promise<MarketAIContext> {
    const exchange = options.exchange ?? "HOSE";
    const symbol = options.index ?? DEFAULT_INDEX;
    const notes: string[] = [];

    const bars = await this.index(symbol, { asOf: options.asOf, countBack: 260 });
    const snapshot = toIndexSnapshot(bars, symbol);
    const liquidity = computeLiquidity(bars, symbol);
    const avg20 = averageLiquidity(bars, 20);
    const regime = classifyRegime(bars);

    // The price board is always the current session, so a back-dated request
    // cannot have matching breadth or foreign flow. Say so instead of pairing
    // an old index level with today's market internals.
    let breadth: MarketBreadth | null = null;
    let foreign: MarketForeignFlow | null = null;

    if (options.asOf) {
      notes.push(
        `breadth and foreign flow are omitted for asOf=${options.asOf}: the upstream only exposes them for the current session`
      );
    } else {
      const items = await this.priceBoardFor(exchange);
      breadth = computeBreadth(items, exchange, snapshot.date);
      foreign = computeMarketForeignFlow(items, exchange, snapshot.date, 10);
    }

    return {
      date: snapshot.date,
      index: snapshot,
      regime: regime.regime,
      rationale: regime.rationale,
      liquidity: {
        value: liquidity.value,
        avg20,
        ratio: avg20 === 0 ? 0 : Math.round((liquidity.value / avg20) * 1000) / 1000,
        signal: liquiditySignal(liquidity.value, avg20),
        unit: "tyVND",
      },
      breadth,
      foreign,
      notes,
    };
  }

  /** Current-session foreign flow for one symbol. */
  symbolForeignFlow(symbol: string): Promise<ForeignFlow> {
    return fetchSymbolForeignFlow(this.adapter, symbol);
  }

  private async priceBoardFor(exchange: Exchange | "ALL"): Promise<PriceBoardItem[]> {
    const targets = exchange === "ALL" ? EXCHANGES : [exchange];
    if (exchange !== "ALL" && EXCHANGES.indexOf(exchange) === -1) {
      throw new InvalidParameterError("exchange", exchange, EXCHANGES.concat(["ALL" as Exchange]));
    }

    // Fetched per exchange rather than as one ~1500-symbol request: the upstream
    // handles a full board fine (measured 823 symbols in ~300ms) but batching by
    // exchange keeps any single failure scoped.
    const boards = await Promise.all(
      targets.map(async (ex) => {
        const listed = await this.adapter.fetchSymbolsByGroup(ex);
        const symbols = listed.map((s) => s.symbol);
        if (symbols.length === 0) return [];
        return this.adapter.fetchPriceBoard(symbols);
      })
    );

    return boards.reduce<PriceBoardItem[]>((all, b) => all.concat(b), []);
  }

  /**
   * The price board carries no date, and "today" is wrong on weekends and
   * holidays when it still serves the last session. Read the date off the index
   * instead so the label matches the data.
   */
  private sessionDate(): Promise<string> {
    return fetchSessionDate(this.adapter);
  }
}

/**
 * Shared so Stock can label its own foreign-flow output with the same session
 * date the market module uses, instead of each guessing separately.
 */
export async function fetchSessionDate(adapter: StockDataAdapter): Promise<string> {
  const bars = await adapter.fetchQuoteHistory({
    symbols: [DEFAULT_INDEX],
    start: backdate(undefined, 5),
    timeFrame: "1D",
    countBack: 5,
  });
  return bars.length > 0 ? bars[bars.length - 1].date : "";
}

export async function fetchSymbolForeignFlow(
  adapter: StockDataAdapter,
  symbol: string
): Promise<ForeignFlow> {
  const [items, date] = await Promise.all([
    adapter.fetchPriceBoard([symbol]),
    fetchSessionDate(adapter),
  ]);
  if (items.length === 0 || !items[0].symbol) {
    throw new InvalidParameterError("symbol", symbol, ["a listed symbol"]);
  }
  return computeSymbolForeignFlow(items[0], date);
}

function assertIndexSymbol(symbol: string): void {
  const upper = symbol.toUpperCase();
  const known = INDEX_SYMBOLS.map((s) => s.toUpperCase());
  if (known.indexOf(upper) === -1) {
    throw new InvalidParameterError("index", symbol, INDEX_SYMBOLS);
  }
}

function backdate(asOf: string | undefined, countBack: number): string {
  const anchor = asOf ? new Date(asOf) : new Date();
  // Calendar days, padded for weekends and holidays so countBack sessions land.
  anchor.setDate(anchor.getDate() - Math.ceil(countBack * 1.6) - 10);
  return anchor.toISOString().substring(0, 10);
}

export { Market };
