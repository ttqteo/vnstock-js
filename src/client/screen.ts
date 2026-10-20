import { Quote } from "../types";
import { Transport } from "../transport";
import { InvalidParameterError } from "../errors";
import { VCI_COMPANY_URL } from "../shared/constants";
import { ScreenFilter, ScreenResult } from "../models/screening";
import { SymbolRatios } from "../models/ratios";

/**
 * Fields the price board already carries, so filtering on them costs nothing extra. Everything
 * else needs one request per symbol, which is what makes the upstream answer 429.
 */
const BOARD_FIELDS = ["price", "priceChange", "changePercent", "volume", "value", "exchange", "symbol"];

/**
 * Quarterly fundamentals of the prebuilt ratios file; with it loaded, filtering on these costs
 * nothing either. PE, PB, PS and marketCap move with the price, so they always come per symbol.
 */
const PREBUILT_FIELDS = ["roe", "roa", "roic", "grossMargin", "ebitMargin", "currentRatio", "quickRatio", "debtToEquity", "dividendYield", "shares"];

export function isBoardField(field: string): boolean {
  return BOARD_FIELDS.includes(field);
}

export function isPrebuiltField(field: string): boolean {
  return PREBUILT_FIELDS.includes(field);
}

/** True when the field can only come from a per-symbol request. */
export function needsUpstream(field: string, hasPrebuilt: boolean): boolean {
  if (isBoardField(field)) return false;
  if (hasPrebuilt && isPrebuiltField(field)) return false;
  return true;
}

/** Keeps rows passing every filter (missing values fail), then sorts and limits. */
export function applyFilters<T extends Record<string, unknown>>(
  data: T[],
  filters: ScreenFilter[],
  options: { sortBy?: string; order?: "asc" | "desc"; limit?: number } = {}
): T[] {
  let result = data.filter((item) =>
    filters.every((f) => {
      const val = item[f.field] as number | string | null | undefined;
      if (val === null || val === undefined) return false;
      switch (f.operator) {
        case "<":
          return val < f.value;
        case ">":
          return val > f.value;
        case "<=":
          return val <= f.value;
        case ">=":
          return val >= f.value;
        case "=":
          return val === f.value;
        default:
          return true;
      }
    })
  );
  if (options.sortBy) {
    const sortBy = options.sortBy;
    const dir = options.order === "asc" ? 1 : -1;
    result.sort((a, b) => ((a[sortBy] as number) - (b[sortBy] as number)) * dir);
  }
  if (options.limit && options.limit > 0) result = result.slice(0, options.limit);
  return result;
}

/** Runs `fn` over `items` with at most `size` in flight, results in input order. */
export async function pool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor++;
      out[index] = await fn(items[index]);
    }
  }
  const workers = [];
  for (let i = 0; i < Math.max(1, Math.min(size, items.length)); i++) workers.push(worker());
  await Promise.all(workers);
  return out;
}

/** Applies the prebuilt quarterly figures; leaves price-derived ones alone. */
export function mergePrebuilt(row: ScreenResult, r: SymbolRatios | undefined): void {
  if (!r) return;
  row.roe = r.roe;
  row.roa = r.roa;
  row.roic = r.roic;
  row.grossMargin = r.grossMargin;
  row.ebitMargin = r.ebitMargin;
  row.currentRatio = r.currentRatio;
  row.quickRatio = r.quickRatio;
  row.debtToEquity = r.debtToEquity;
  row.dividendYield = r.dividendYield;
  row.shares = r.shares;
  row.ratioPeriod = r.period;
}

/** Comparisons on one field. Ratios are fractions (roe 0.15 is 15%), money is in dong. */
export interface WhereClause {
  lt?: number;
  lte?: number;
  gt?: number;
  gte?: number;
  eq?: number | string;
}

export interface ScreenOptions {
  /** A listing group such as VN30 or HNX30. Takes precedence over exchange. */
  group?: string;
  /** HOSE, HNX or UPCOM (HSX is read as HOSE). One of group or exchange is required. */
  exchange?: string;
  /** e.g. { pe: { lt: 15 }, roe: { gt: 0.15 } } */
  where?: Record<string, WhereClause>;
  /** Field to sort by; a leading "-" sorts descending, e.g. "-roe". */
  sort?: string;
  limit?: number;
  /** Parallel per-symbol statistics requests. Kept low: the upstream answers 429 when pushed. Default 5. */
  concurrency?: number;
}

/** One screened symbol. price, value and marketCap are in dong. */
export type ScreenRow = ScreenResult;

export interface ScreenSource {
  fetchSymbolsByGroup(group: string): Promise<{ symbol: string }[]>;
  fetchQuotes(symbols: string[]): Promise<Quote[]>;
  fetchSymbolsByIndustries(): Promise<{ symbol: string; industry?: string; industryEn?: string }[]>;
  /** Latest valuation and ratio row of one symbol (pe, pb, marketCap in dong, ...), or null. */
  fetchStatistics(symbol: string): Promise<any | null>;
}

const OPERATORS: Record<keyof WhereClause, ScreenFilter["operator"]> = { lt: "<", lte: "<=", gt: ">", gte: ">=", eq: "=" };
const DEFAULT_CONCURRENCY = 5;
/** Ratios are quarterly figures, so an hour-old answer is still the same answer. */
const STATISTICS_TTL_MS = 60 * 60 * 1000;

/** where clauses as the filter list the shared filter code runs. */
export function toFilters(where: Record<string, WhereClause> = {}): ScreenFilter[] {
  const out: ScreenFilter[] = [];
  for (const field of Object.keys(where)) {
    const clause = where[field] || {};
    for (const op of Object.keys(clause)) {
      const operator = OPERATORS[op as keyof WhereClause];
      if (!operator) {
        throw new InvalidParameterError("where." + field, op, Object.keys(OPERATORS), "Operators are lt, lte, gt, gte, eq, e.g. { pe: { lt: 15 } }.");
      }
      out.push({ field, operator, value: (clause as any)[op] });
    }
  }
  return out;
}

export function parseSort(sort: string | undefined): { sortBy: string | undefined; order: "asc" | "desc" } {
  if (!sort) return { sortBy: undefined, order: "desc" };
  return sort.startsWith("-") ? { sortBy: sort.substring(1), order: "desc" } : { sortBy: sort, order: "asc" };
}

function num(v: unknown): number | null {
  return typeof v === "number" && isFinite(v) ? v : null;
}

function quoteToRow(q: Quote): ScreenRow {
  return {
    symbol: q.symbol,
    companyName: q.name || "",
    companyNameEn: q.nameEn || "",
    industry: "",
    industryEn: "",
    exchange: q.exchange || "",
    price: q.price,
    priceChange: q.change,
    changePercent: q.changePct,
    volume: q.volume || 0,
    value: q.value || 0,
    marketCap: 0,
    pe: null,
    pb: null,
    ps: null,
    roe: null,
    roa: null,
    roic: null,
    debtToEquity: null,
    dividendYield: null,
    grossMargin: null,
    currentRatio: null,
  };
}

/** Applies one per-symbol statistics row; market cap is already in dong. */
export function mergeStatistics(row: ScreenRow, s: any): void {
  if (!s) return;
  row.pe = num(s.pe);
  row.pb = num(s.pb);
  row.ps = num(s.ps);
  row.roe = num(s.roe);
  row.roa = num(s.roa);
  row.roic = num(s.roic);
  row.debtToEquity = num(s.debtToEquity ?? s.debtPerEquity);
  row.dividendYield = num(s.dividendYield);
  row.grossMargin = num(s.grossMargin);
  row.currentRatio = num(s.currentRatio);
  // The upstream already reports market cap in dong.
  row.marketCap = num(s.marketCap) ?? 0;
}

function checkOptions(options: ScreenOptions & Record<string, unknown>): void {
  if (options.filters !== undefined) {
    throw new InvalidParameterError("filters", "[...]", undefined, "v2 uses where: { pe: { lt: 15 } } instead of filters.");
  }
  if (options.sortBy !== undefined || options.order !== undefined) {
    throw new InvalidParameterError(
      "sortBy",
      String(options.sortBy ?? options.order),
      undefined,
      'v2 uses sort: "-roe" (leading "-" for descending) instead of sortBy and order.'
    );
  }
}

/**
 * Screens one listing group or exchange. Board fields and the prebuilt quarterly ratios filter
 * first at no cost; per-symbol statistics (pe, pb, marketCap, ...) are fetched only for the
 * symbols that survive, a few at a time.
 * @example
 * const rows = await screen(source, { group: "VN30", where: { pe: { lt: 15 }, roe: { gt: 0.15 } }, sort: "-roe", limit: 10 }, ratios);
 */
export async function screen(source: ScreenSource, options: ScreenOptions, ratios: Record<string, SymbolRatios> | null): Promise<ScreenRow[]> {
  checkOptions(options as ScreenOptions & Record<string, unknown>);
  const rawUniverse = options.group || options.exchange;
  if (!rawUniverse) {
    throw new InvalidParameterError(
      "group|exchange",
      "undefined",
      ["VN30", "HNX30", "HOSE", "HNX", "UPCOM"],
      'Pass { group: "VN30" } or { exchange: "HOSE" }.'
    );
  }
  const universe = rawUniverse.toUpperCase() === "HSX" ? "HOSE" : rawUniverse;
  const filters = toFilters(options.where);
  const { sortBy, order } = parseSort(options.sort);
  const hasPrebuilt = !!ratios;

  const symbols = (await source.fetchSymbolsByGroup(universe)).map((s) => s.symbol);
  if (symbols.length === 0) return [];

  const quotes = await source.fetchQuotes(symbols);
  let rows = quotes.filter((q) => q && q.symbol).map(quoteToRow);
  if (ratios) for (const row of rows) mergePrebuilt(row, ratios[row.symbol]);

  // Everything free runs before anything paid.
  const freeFilters = filters.filter((f) => !needsUpstream(f.field, hasPrebuilt));
  const paidFilters = filters.filter((f) => needsUpstream(f.field, hasPrebuilt));
  if (freeFilters.length > 0) rows = applyFilters(rows as Record<string, unknown>[], freeFilters) as ScreenRow[];

  const needsStatistics = paidFilters.length > 0 || (sortBy !== undefined && needsUpstream(sortBy, hasPrebuilt));
  if (needsStatistics && rows.length > 0) {
    const stats = await pool(rows, options.concurrency ?? DEFAULT_CONCURRENCY, (r) => source.fetchStatistics(r.symbol).catch(() => null));
    rows.forEach((row, i) => mergeStatistics(row, stats[i]));
  }

  // Industry names are a nicety; a failure here should not sink the screen.
  const industries = await source.fetchSymbolsByIndustries().catch(() => []);
  const bySymbol: Record<string, { industry?: string; industryEn?: string }> = {};
  for (const item of industries) bySymbol[item.symbol] = item;
  for (const row of rows) {
    const info = bySymbol[row.symbol];
    if (info) {
      row.industry = info.industry || "";
      row.industryEn = info.industryEn || "";
    }
  }

  return applyFilters(rows as Record<string, unknown>[], paidFilters, { sortBy, order, limit: options.limit }) as ScreenRow[];
}

/**
 * Per-symbol statistics over a transport, cached for an hour per symbol; null when unreachable.
 * @example
 * const source = { ...adapter, fetchStatistics: statisticsFetcher(transport) };
 */
export function statisticsFetcher(transport: Transport, ttl: number = STATISTICS_TTL_MS): (symbol: string) => Promise<any | null> {
  const cache: Record<string, { at: number; data: any }> = {};
  return async (symbol: string) => {
    const hit = cache[symbol];
    if (hit && Date.now() - hit.at < ttl) return hit.data;
    try {
      const res = await transport.request<any>({ url: VCI_COMPANY_URL + "/" + symbol + "/statistics-financial", method: "GET" });
      const rows = (res && res.data) || [];
      // The endpoint returns a history; the newest row is the current set.
      const latest = rows.length > 0 ? rows[rows.length - 1] : null;
      cache[symbol] = { at: Date.now(), data: latest };
      return latest;
    } catch {
      return null;
    }
  };
}
