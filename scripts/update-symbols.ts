import * as fs from "fs";
import * as path from "path";
import { createTransport } from "../src/transport";
import { VciAdapter } from "../src/adapters/vci";

interface SymbolEntry {
  symbol: string;
  companyName: string;
  companyNameEn: string;
  exchange: string;
  industry: string;
  industryEn: string;
  sector: string;
  sectorEn: string;
  icbCode: string;
  vn30: boolean;
}

async function main() {
  const source = new VciAdapter({ transport: createTransport() });

  console.log("Fetching symbolsByIndustries...");
  const industries = await source.fetchSymbolsByIndustries();

  console.log("Fetching symbolsByExchange...");
  const exchanges = await source.fetchSymbolsByExchange();

  console.log("Fetching symbolsByGroup('VN30')...");
  const vn30List = await source.fetchSymbolsByGroup("VN30");

  const vn30Set = new Set(vn30List.map((s) => s.symbol));

  // Build exchange lookup: symbol -> exchange
  const exchangeMap = new Map<string, string>();
  for (const item of exchanges) {
    exchangeMap.set(item.symbol, item.exchange);
  }

  // Build merged dataset from industries (which has the richest data)
  const symbolMap = new Map<string, SymbolEntry>();

  for (const item of industries) {
    symbolMap.set(item.symbol, {
      symbol: item.symbol,
      companyName: item.companyName,
      companyNameEn: item.companyNameEn,
      exchange: exchangeMap.get(item.symbol) || "",
      industry: item.industry,
      industryEn: item.industryEn,
      sector: item.sector,
      sectorEn: item.sectorEn,
      icbCode: item.icbCode4 || "",
      vn30: vn30Set.has(item.symbol),
    });
  }

  // Add any symbols from exchange list that are missing from industries
  for (const item of exchanges) {
    if (!symbolMap.has(item.symbol)) {
      symbolMap.set(item.symbol, {
        symbol: item.symbol,
        companyName: item.companyName,
        companyNameEn: item.companyNameEn,
        exchange: item.exchange,
        industry: "",
        industryEn: "",
        sector: "",
        sectorEn: "",
        icbCode: "",
        vn30: vn30Set.has(item.symbol),
      });
    }
  }

  // Sort alphabetically by symbol
  const result = Array.from(symbolMap.values()).sort((a, b) => a.symbol.localeCompare(b.symbol));

  const outDir = path.resolve(__dirname, "..", "data");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, "symbols.json");
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), "utf-8");

  console.log(`Written ${result.length} symbols to ${outPath}`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exitCode = 1;
});
