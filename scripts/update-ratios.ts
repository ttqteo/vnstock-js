import * as fs from "fs";
import * as path from "path";
import axios from "axios";
import { Vnstock } from "../src/runtime";
import { headers, VCI_COMPANY_URL } from "../src/shared/constants";
import { SymbolRatios, RatiosFile } from "../src/models/ratios";

/**
 * Builds data/ratios.json: the quarterly fundamentals screening needs, so that
 * filtering on ROE and friends costs no upstream requests at all.
 *
 * Only slow-moving figures go in. PE, PB, PS and market cap are derived from
 * the live price and would be wrong the day after this runs, so screening keeps
 * fetching those per symbol.
 */

const EXCHANGES = ["HOSE", "HNX", "UPCOM"];
const CONCURRENCY = 4;
const OUT = path.join(__dirname, "..", "data", "ratios.json");

async function pool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const i = cursor++;
      out[i] = await fn(items[i]);
      if (i % 100 === 0) process.stderr.write(`  ${i}/${items.length}\n`);
    }
  }
  await Promise.all(Array.from({ length: size }, worker));
  return out;
}

function num(v: unknown): number | null {
  return typeof v === "number" && isFinite(v) ? v : null;
}

async function fetchOne(symbol: string): Promise<SymbolRatios | null> {
  try {
    const res = await axios.get(`${VCI_COMPANY_URL}/${symbol}/statistics-financial`, {
      headers,
      timeout: 20000,
    });
    const rows = res.data?.data || [];
    if (rows.length === 0) return null;
    const r = rows[rows.length - 1];

    return {
      symbol,
      period: `${r.year || r.yearReport || ""}Q${r.quarter || ""}`,
      roe: num(r.roe),
      roa: num(r.roa),
      roic: num(r.roic),
      grossMargin: num(r.grossMargin),
      ebitMargin: num(r.ebitMargin),
      currentRatio: num(r.currentRatio),
      quickRatio: num(r.quickRatio),
      debtToEquity: num(r.debtToEquity ?? r.debtPerEquity),
      dividendYield: num(r.dividendYield),
      shares: num(r.numberOfSharesMktCap),
    };
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const v = new Vnstock();

  const symbols: string[] = [];
  for (const ex of EXCHANGES) {
    const listed = await v.stock.listing.symbolsByGroup(ex);
    for (const s of listed) symbols.push(s.symbol);
  }
  const unique = Array.from(new Set(symbols));
  process.stderr.write(`Fetching ratios for ${unique.length} symbols\n`);

  const results = await pool(unique, CONCURRENCY, fetchOne);
  const ratios = results.filter(Boolean) as SymbolRatios[];

  // A large drop usually means the upstream changed shape rather than the
  // market shrinking. Refuse to overwrite a good file with a broken one.
  if (fs.existsSync(OUT)) {
    const prev: RatiosFile = JSON.parse(fs.readFileSync(OUT, "utf8"));
    if (prev.count > 0 && ratios.length < prev.count * 0.8) {
      throw new Error(
        `Only ${ratios.length} symbols resolved, previous file had ${prev.count}. ` +
          `Refusing to overwrite; check the upstream response shape.`
      );
    }
  }

  const file: RatiosFile = {
    generatedAt: new Date().toISOString().substring(0, 10),
    count: ratios.length,
    ratios: ratios.sort((a, b) => a.symbol.localeCompare(b.symbol)),
  };

  fs.writeFileSync(OUT, JSON.stringify(file, null, 0) + "\n", "utf8");
  const kb = Math.round(fs.statSync(OUT).size / 1024);
  process.stderr.write(`Wrote ${OUT}: ${ratios.length} symbols, ${kb} kB\n`);
}

main().catch((e) => {
  process.stderr.write(`Failed: ${e.message}\n`);
  process.exit(1);
});
