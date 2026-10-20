import { Quote } from "../types";
import { SymbolInfo } from "../models/normalized";
import { InvalidParameterError } from "../errors";

/** One holding. `cost` is the average cost per share in dong. */
export interface Position {
  symbol: string;
  quantity: number;
  cost: number;
  broker?: string;
  note?: string;
  tags?: string[];
}

export interface PortfolioInput {
  positions: Position[];
  /** Cash in dong, in total or per broker. */
  cash?: number | Record<string, number>;
}

export interface ValuedPosition extends Position {
  /** Last match price, or the reference price before the first match, in dong. */
  price: number;
  value: number;
  pnl: number;
  /** Percent: 5.833 means 5.833%. */
  pnlPct: number;
  /** Fraction of the portfolio NAV. */
  weight: number;
  /** Vietnamese industry name from the symbol list, "" when unknown. */
  industry: string;
}

export interface PortfolioTotals {
  value: number;
  cost: number;
  pnl: number;
  /** Percent. */
  pnlPct: number;
  cash: number;
  nav: number;
}

export interface PortfolioSummary {
  date: string;
  positions: ValuedPosition[];
  /** Positions without a broker, and cash given as one number, go under "default". */
  byBroker: Record<string, PortfolioTotals>;
  /** Weight is a fraction of NAV. */
  byIndustry: Record<string, { value: number; weight: number }>;
  totals: PortfolioTotals;
  unit: "VND";
}

export const DEFAULT_BROKER = "default";

/** Rounds to 3 decimals; not a unit change. */
function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function pct(pnl: number, cost: number): number {
  return cost === 0 ? 0 : round3((pnl / cost) * 100);
}

function emptyTotals(): PortfolioTotals {
  return { value: 0, cost: 0, pnl: 0, pnlPct: 0, cash: 0, nav: 0 };
}

/** Checks positions and cash before any request; throws InvalidParameterError with a hint. */
export function checkPortfolio(input: PortfolioInput): void {
  if (!input || !Array.isArray(input.positions)) {
    throw new InvalidParameterError("positions", input && (input as any).positions, undefined, "Pass { positions: [{ symbol, quantity, cost }], cash }.");
  }
  input.positions.forEach((p, i) => {
    if (!p || typeof p.symbol !== "string" || p.symbol === "")
      throw new InvalidParameterError(`positions[${i}].symbol`, p && p.symbol, undefined, 'symbol is a ticker such as "FPT".');
    if (!(typeof p.quantity === "number" && p.quantity > 0))
      throw new InvalidParameterError(`positions[${i}].quantity`, p.quantity, undefined, "quantity is a number of shares above 0.");
    if (!(typeof p.cost === "number" && p.cost >= 0))
      throw new InvalidParameterError(`positions[${i}].cost`, p.cost, undefined, "cost is the average price per share in dong, e.g. 125800.");
  });
  const cash = input.cash;
  const amounts = cash === undefined ? [] : typeof cash === "number" ? [cash] : typeof cash === "object" && cash ? Object.values(cash) : [NaN];
  if (amounts.some((c) => typeof c !== "number" || !isFinite(c))) {
    throw new InvalidParameterError("cash", cash, undefined, "cash is dong, as a number or { broker: number }.");
  }
}

/**
 * Values holdings at the given quotes: per position, per broker, per industry and in total.
 * @example
 * valuePortfolio({ positions: [{ symbol: "FPT", quantity: 100, cost: 120000 }] }, quotes, symbols, "2026-10-14").totals.pnl
 */
export function valuePortfolio(input: PortfolioInput, quotes: Quote[], symbols: SymbolInfo[], date: string): PortfolioSummary {
  const quoteOf = new Map(quotes.filter((q) => q && q.symbol).map((q) => [q.symbol, q] as [string, Quote]));
  const industryOf = new Map(symbols.map((s) => [s.symbol, s.industry] as [string, string]));

  const positions: ValuedPosition[] = input.positions.map((p) => {
    const symbol = p.symbol.toUpperCase();
    const q = quoteOf.get(symbol);
    const price = q ? (q.price > 0 ? q.price : q.ref) : 0;
    const value = p.quantity * price;
    const cost = p.quantity * p.cost;
    return { ...p, symbol, price, value, pnl: value - cost, pnlPct: pct(value - cost, cost), weight: 0, industry: industryOf.get(symbol) || "" };
  });

  const byBroker: Record<string, PortfolioTotals> = {};
  const bucket = (name: string) => byBroker[name] || (byBroker[name] = emptyTotals());
  for (const p of positions) {
    const b = bucket(p.broker || DEFAULT_BROKER);
    b.value += p.value;
    b.cost += p.quantity * p.cost;
  }
  const cash = typeof input.cash === "number" ? { [DEFAULT_BROKER]: input.cash } : input.cash || {};
  for (const name of Object.keys(cash)) bucket(name).cash += cash[name];

  const totals = emptyTotals();
  for (const b of Object.values(byBroker)) {
    b.pnl = b.value - b.cost;
    b.pnlPct = pct(b.pnl, b.cost);
    b.nav = b.value + b.cash;
    totals.value += b.value;
    totals.cost += b.cost;
    totals.cash += b.cash;
  }
  totals.pnl = totals.value - totals.cost;
  totals.pnlPct = pct(totals.pnl, totals.cost);
  totals.nav = totals.value + totals.cash;

  const byIndustry: Record<string, { value: number; weight: number }> = {};
  for (const p of positions) {
    p.weight = totals.nav > 0 ? p.value / totals.nav : 0;
    const key = p.industry || "unknown";
    const g = byIndustry[key] || (byIndustry[key] = { value: 0, weight: 0 });
    g.value += p.value;
    g.weight = totals.nav > 0 ? g.value / totals.nav : 0;
  }

  return { date, positions, byBroker, byIndustry, totals, unit: "VND" };
}
