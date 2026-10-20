import { Transport } from "../transport";
import { BASE_URL } from "../shared/constants";

export interface TopMover {
  symbol: string;
  exchange: string;
  /** Prices in dong as the source reports them; null when missing. */
  price1DayAgo: number | null;
  price5DaysAgo: number | null;
  price20DaysAgo: number | null;
  /** Market capitalisation in dong. */
  marketCap: number | null;
  /** Average traded value as the source computes it, in dong. */
  liquidity: number | null;
}

export interface TopMovers {
  gainers: TopMover[];
  losers: TopMover[];
}

const URL = BASE_URL + "/api/price-alert-service/api/v1/non-authen/top-stock-change";

function num(v: unknown): number | null {
  return typeof v === "number" && isFinite(v) ? v : null;
}

/** This endpoint reports money in million dong. */
function millionToDong(v: unknown): number | null {
  const n = num(v);
  return n === null ? null : Math.round(n * 1e6);
}

async function side(t: Transport, gainers: boolean): Promise<TopMover[]> {
  const raw = await t.request<any[]>({
    url: URL,
    method: "POST",
    data: { topStockType: gainers ? 1 : 0, timeFrame: "ONE_DAY", exchangeCode: null, stockCodes: null },
  });
  return (Array.isArray(raw) ? raw : []).map((r) => ({
    symbol: r.stockCode || "",
    exchange: r.group || "",
    price1DayAgo: num(r.lastPrice1DayAgo),
    price5DaysAgo: num(r.lastPrice5DaysAgo),
    price20DaysAgo: num(r.lastPrice20DaysAgo),
    marketCap: millionToDong(r.marketCap),
    liquidity: millionToDong(r.liquidity),
  }));
}

/**
 * Today's top gainers and losers across the market (the source only ranks by day).
 * @example
 * const { gainers } = await topMovers(transport, { limit: 5 });
 */
export async function topMovers(t: Transport, options: { limit?: number } = {}): Promise<TopMovers> {
  const limit = options.limit ?? 10;
  const [gainers, losers] = await Promise.all([side(t, true), side(t, false)]);
  return { gainers: gainers.slice(0, limit), losers: losers.slice(0, limit) };
}
