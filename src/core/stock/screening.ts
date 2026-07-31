import { fetchWithRetry } from "../../pipeline/fetch";
import { VCI_COMPANY_URL } from "../../shared/constants";
import { InvalidParameterError } from "../../errors";
import { ScreenFilter, ScreenOptions, ScreenResult } from "../../models/screening";
import { StockDataAdapter } from "../../adapters/types";
import { VciAdapter } from "../../adapters/vci";
import { PriceBoardItem } from "../../models/normalized";

export { ScreenFilter };

export function applyFilters<T extends Record<string, unknown>>(
  data: T[],
  filters: ScreenFilter[],
  options: { sortBy?: string; order?: "asc" | "desc"; limit?: number } = {}
): T[] {
  let result = data.filter((item) =>
    filters.every((f) => {
      const val = item[f.field];
      if (val === null || val === undefined) return false;
      switch (f.operator) {
        case "<": return val < f.value;
        case ">": return val > f.value;
        case "<=": return val <= f.value;
        case ">=": return val >= f.value;
        case "=": return val === f.value;
        default: return true;
      }
    })
  );

  if (options.sortBy) {
    const sortBy = options.sortBy;
    const dir = options.order === "asc" ? 1 : -1;
    result.sort((a, b) => {
      const aVal = a[sortBy] as number;
      const bVal = b[sortBy] as number;
      return (aVal - bVal) * dir;
    });
  }

  if (options.limit && options.limit > 0) {
    result = result.slice(0, options.limit);
  }

  return result;
}

/**
 * Fields the price board already carries, so filtering on them costs nothing
 * extra. Everything else needs one request per symbol, which is what makes the
 * upstream answer 429.
 */
const BOARD_FIELDS = [
  "price",
  "priceChange",
  "changePercent",
  "volume",
  "value",
  "exchange",
  "symbol",
];

/** Ratios are quarterly figures, so an hour-old answer is still the same answer. */
const RATIO_TTL_MS = 60 * 60 * 1000;
const ratioCache: Record<string, { at: number; data: any }> = {};

const DEFAULT_CONCURRENCY = 5;

export function isBoardField(field: string): boolean {
  return BOARD_FIELDS.indexOf(field) !== -1;
}

/** Runs `fn` over `items` with at most `size` in flight. */
export async function pool<T, R>(
  items: T[],
  size: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor++;
      out[index] = await fn(items[index]);
    }
  }

  const workers = [];
  for (let i = 0; i < Math.max(1, Math.min(size, items.length)); i++) {
    workers.push(worker());
  }
  await Promise.all(workers);
  return out;
}

export function boardToResult(item: PriceBoardItem): ScreenResult {
  const change = item.price - item.referencePrice;
  return {
    symbol: item.symbol,
    companyName: item.companyName || "",
    companyNameEn: item.companyNameEn || "",
    industry: "",
    industryEn: "",
    exchange: item.exchange || "",
    price: item.price,
    priceChange: round(change),
    changePercent: item.referencePrice > 0 ? round((change / item.referencePrice) * 100) : 0,
    volume: item.totalVolume || 0,
    // totalValue is trieu VND; market-level money in this library is ty VND.
    value: round((item.totalValue || 0) / 1000),
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

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export default class Screening {
  private adapter: StockDataAdapter;

  constructor(adapter?: StockDataAdapter) {
    this.adapter = adapter || new VciAdapter();
  }

  /**
   * Screens one listing group or exchange. A universe is required rather than
   * defaulted to the whole market: ratios cost one request per symbol, and
   * ~2000 of them in a burst is what draws a 429.
   *
   * Load is kept down in four ways:
   *   1. the universe is explicit and usually small
   *   2. the price board answers for every symbol in a single request
   *   3. filters on price-board fields run first, so ratios are only fetched
   *      for symbols that already survived
   *   4. ratios are cached for an hour, which is far shorter than the quarter
   *      they actually change on
   */
  async screen(options: ScreenOptions = {}): Promise<ScreenResult[]> {
    const { filters = [], sortBy, order = "desc", limit } = options;
    const universe = options.group || options.exchange;

    if (!universe) {
      throw new InvalidParameterError("group|exchange", "undefined", [
        "VN30",
        "HNX30",
        "HOSE",
        "HNX",
        "UPCOM",
      ]);
    }

    const listed = await this.adapter.fetchSymbolsByGroup(universe);
    const symbols = listed.map((s) => s.symbol);
    if (symbols.length === 0) return [];

    const board = await this.adapter.fetchPriceBoard(symbols);
    let rows = board.filter((b) => b.symbol).map(boardToResult);

    // Split the filters so the cheap ones can shrink the set before any ratio
    // request goes out.
    const boardFilters = filters.filter((f) => isBoardField(f.field));
    const ratioFilters = filters.filter((f) => !isBoardField(f.field));

    if (boardFilters.length > 0) {
      rows = applyFilters(rows as unknown as Record<string, unknown>[], boardFilters) as unknown as ScreenResult[];
    }

    // Ratios are only worth fetching when something actually needs them.
    const needsRatios =
      ratioFilters.length > 0 || (sortBy !== undefined && !isBoardField(sortBy));

    if (needsRatios && rows.length > 0) {
      const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY;
      const ratios = await pool(rows, concurrency, (r) => this.fetchRatios(r.symbol));
      for (let i = 0; i < rows.length; i++) {
        mergeRatios(rows[i], ratios[i]);
      }
    }

    const industries = await this.industryMap();
    for (const row of rows) {
      const info = industries[row.symbol];
      if (info) {
        row.industry = info.industry || "";
        row.industryEn = info.industryEn || "";
      }
    }

    return applyFilters(
      rows as unknown as Record<string, unknown>[],
      ratioFilters,
      { sortBy, order, limit }
    ) as unknown as ScreenResult[];
  }

  private async industryMap(): Promise<Record<string, { industry: string; industryEn: string }>> {
    const list = await this.adapter.fetchSymbolsByIndustries();
    const map: Record<string, { industry: string; industryEn: string }> = {};
    for (const item of list as any[]) {
      map[item.symbol] = { industry: item.industry, industryEn: item.industryEn };
    }
    return map;
  }

  private async fetchRatios(symbol: string): Promise<any | null> {
    const hit = ratioCache[symbol];
    if (hit && Date.now() - hit.at < RATIO_TTL_MS) return hit.data;

    try {
      const res = await fetchWithRetry<any>({
        url: `${VCI_COMPANY_URL}/${symbol}/statistics-financial`,
        method: "GET",
      });
      const rows = res?.data || [];
      // The endpoint returns a history; the newest row is the current ratio set.
      const latest = rows.length > 0 ? rows[rows.length - 1] : null;
      ratioCache[symbol] = { at: Date.now(), data: latest };
      return latest;
    } catch {
      // One unreachable symbol should not sink the whole screen; it simply has
      // no ratios and therefore fails any ratio filter.
      return null;
    }
  }
}

export function mergeRatios(row: ScreenResult, ratio: any): void {
  if (!ratio) return;
  row.pe = num(ratio.pe);
  row.pb = num(ratio.pb);
  row.ps = num(ratio.ps);
  row.roe = num(ratio.roe);
  row.roa = num(ratio.roa);
  row.roic = num(ratio.roic);
  row.debtToEquity = num(ratio.debtToEquity ?? ratio.debtPerEquity);
  row.dividendYield = num(ratio.dividendYield);
  row.grossMargin = num(ratio.grossMargin);
  row.currentRatio = num(ratio.currentRatio);
  // marketCap arrives in VND; the library reports market-level money in ty VND.
  row.marketCap = ratio.marketCap ? round(ratio.marketCap / 1e9) : 0;
}

function num(v: unknown): number | null {
  return typeof v === "number" && isFinite(v) ? v : null;
}

/** Exposed for tests; clears the hour-long ratio cache. */
export function clearRatioCache(): void {
  for (const k of Object.keys(ratioCache)) delete ratioCache[k];
}
