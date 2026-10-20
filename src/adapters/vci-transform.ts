import { Bar, Quote } from "../types";
import { ictDate, ictDateTime } from "../shared/time";

const MILLION = 1e6;

export type SourceFrame = "ONE_MINUTE" | "ONE_HOUR" | "ONE_DAY";

/** VCI reports the HOSE board as "HSX"; v2 always says HOSE. */
export function normalizeExchange(board: string): string {
  const b = (board || "").toUpperCase();
  return b === "HSX" ? "HOSE" : b;
}

/**
 * One VCI chart series to v2 bars. Stock prices stay in dong and index levels in points, as VCI
 * sends them; turnover comes in million dong and is scaled to dong. Daily bars are stamped with
 * the ICT date, intraday bars with ICT time.
 */
export function toBars(raw: any, frame: SourceFrame): Bar[] {
  const n = raw && raw.t ? raw.t.length : 0;
  const stamp = frame === "ONE_DAY" ? ictDate : ictDateTime;
  const out: Bar[] = [];
  for (let i = 0; i < n; i++) {
    const v = raw.accumulatedValue ? raw.accumulatedValue[i] : undefined;
    out.push({
      time: stamp(raw.t[i]),
      open: raw.o[i],
      high: raw.h[i],
      low: raw.l[i],
      close: raw.c[i],
      volume: raw.v[i],
      value: v === undefined || v === null ? null : Math.round(v * MILLION),
    });
  }
  return out;
}

/** Rounds to 3 decimals; not a unit change. */
function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** One VCI price-board row to a v2 quote, every price and value in dong. */
export function toQuote(raw: any): Quote {
  const l = (raw && raw.listingInfo) || {};
  const m = (raw && raw.matchPrice) || {};
  const ba = (raw && raw.bidAsk) || {};
  const price = m.matchPrice || 0;
  const ref = l.refPrice || 0;
  // Before the first match price is 0, which would read as a -100% move.
  const change = price > 0 && ref > 0 ? price - ref : 0;
  return {
    symbol: l.symbol || "",
    name: l.organName || "",
    nameEn: l.enOrganName || "",
    exchange: normalizeExchange(l.board),
    price,
    change,
    changePct: change !== 0 ? round3((change / ref) * 100) : 0,
    ref,
    ceiling: l.ceiling || 0,
    floor: l.floor || 0,
    high: m.highest || 0,
    low: m.lowest || 0,
    avg: m.avgMatchPrice || 0,
    volume: m.accumulatedVolume || 0,
    value: Math.round((m.accumulatedValue || 0) * MILLION),
    matchVolume: m.matchVol || 0,
    foreignBuyVolume: m.foreignBuyVolume || 0,
    foreignSellVolume: m.foreignSellVolume || 0,
    bids: (ba.bidPrices || []).map((b: any) => ({ price: b.price || 0, volume: b.volume || 0 })),
    asks: (ba.askPrices || []).map((a: any) => ({ price: a.price || 0, volume: a.volume || 0 })),
  };
}
