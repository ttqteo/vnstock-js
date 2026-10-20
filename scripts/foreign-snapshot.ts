import { PriceBoardItem } from "../src/models/normalized";

export type SnapshotExchange = "HOSE" | "HNX" | "UPCOM";
export type SnapshotRow = [string, string, number, number, number, number];

export interface ForeignSnapshot {
  date: string;
  unit: "VND";
  columns: ["symbol", "exchange", "buyVolume", "sellVolume", "buyValue", "sellValue"];
  rows: SnapshotRow[];
  totals: Record<SnapshotExchange, { buyValue: number; sellValue: number; netValue: number }>;
}

// PriceBoardItem prices are thousand VND in v1; the file is written in dong so
// the v2 reader never converts.
function priceInDong(item: PriceBoardItem): number {
  const p = item.averagePrice > 0 ? item.averagePrice : item.price;
  return Math.round(p * 1000);
}

// VCI reports the HOSE board as "HSX".
function exchangeOf(item: PriceBoardItem): string {
  const e = (item.exchange || "").toUpperCase();
  return e === "HSX" ? "HOSE" : e;
}

/** One day of foreign buy/sell flow per symbol, valued in dong, with per-exchange totals. */
export function buildForeignSnapshot(date: string, items: PriceBoardItem[]): ForeignSnapshot {
  const totals: ForeignSnapshot["totals"] = {
    HOSE: { buyValue: 0, sellValue: 0, netValue: 0 },
    HNX: { buyValue: 0, sellValue: 0, netValue: 0 },
    UPCOM: { buyValue: 0, sellValue: 0, netValue: 0 },
  };
  const rows: SnapshotRow[] = [];
  for (const it of items) {
    if (!it.foreignBuyVolume && !it.foreignSellVolume) continue;
    const price = priceInDong(it);
    const exchange = exchangeOf(it);
    const buyValue = it.foreignBuyVolume * price;
    const sellValue = it.foreignSellVolume * price;
    rows.push([it.symbol, exchange, it.foreignBuyVolume, it.foreignSellVolume, buyValue, sellValue]);
    const t = totals[exchange as SnapshotExchange];
    if (t) {
      t.buyValue += buyValue;
      t.sellValue += sellValue;
      t.netValue = t.buyValue - t.sellValue;
    }
  }
  return {
    date,
    unit: "VND",
    columns: ["symbol", "exchange", "buyVolume", "sellVolume", "buyValue", "sellValue"],
    rows,
    totals,
  };
}
