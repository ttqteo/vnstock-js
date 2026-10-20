import * as fs from "fs";
import * as path from "path";
import { createClient } from "../src/client";
import { Quote } from "../src/types";
import { PriceBoardItem } from "../src/models/normalized";
import { buildForeignSnapshot } from "./foreign-snapshot";

const GROUPS = ["HOSE", "HNX", "UPCOM"];
const MIN_ROWS = 50;

function ictToday(): string {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().substring(0, 10);
}

/**
 * The builder reads v1 price-board fields in thousand dong and writes dong; v2 quotes are already
 * in dong, so prices are handed over divided by 1000 and come back out whole. The builder stays
 * on v1 types so it can be cherry-picked onto master unchanged.
 */
function toBoardItem(q: Quote): PriceBoardItem {
  return {
    symbol: q.symbol,
    exchange: q.exchange,
    price: q.price / 1000,
    averagePrice: q.avg / 1000,
    foreignBuyVolume: q.foreignBuyVolume,
    foreignSellVolume: q.foreignSellVolume,
  } as PriceBoardItem;
}

async function main(): Promise<void> {
  const client = createClient();
  const date = process.argv[2] || ictToday();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Date must be YYYY-MM-DD, got " + date);
  if (!(await client.calendar.isTradingDay(date))) {
    console.log("Not a trading day: " + date);
    return;
  }
  const items: PriceBoardItem[] = [];
  for (const group of GROUPS) {
    // One request per exchange: the board answers a whole exchange at once (UPCOM, ~820 symbols, measured fine).
    const quotes = await client.prices({ exchange: group });
    items.push(...quotes.filter((q) => q && q.symbol).map(toBoardItem));
  }
  const snap = buildForeignSnapshot(date, items);
  if (snap.rows.length < MIN_ROWS) {
    throw new Error("Only " + snap.rows.length + " symbols with foreign flow, refusing to write");
  }
  const [y, m, d] = date.split("-");
  const file = path.join(__dirname, "..", "data", "foreign", y, m, d + ".json");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(snap) + "\n");
  console.log("Wrote " + file + " (" + snap.rows.length + " symbols)");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
