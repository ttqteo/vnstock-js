import { search, getBySymbol, getByExchange, getByIndustry } from "../../src/core/listing/directory";
import { SymbolInfo } from "../../src/models/normalized";

const sym = (symbol: string, exchange: string, companyName: string, industry: string, vn30 = false): SymbolInfo =>
  ({ symbol, exchange, companyName, companyNameEn: companyName, industry, industryEn: industry, vn30 }) as any;

const DATA: SymbolInfo[] = [
  sym("FPT", "HSX", "FPT Corp", "Technology", true),
  sym("FPTS", "HNX", "FPT Securities", "Financial services"),
  sym("VCB", "HSX", "Vietcombank", "Banks", true),
  sym("ACB", "HSX", "Asia Commercial Bank", "Banks"),
  sym("SHS", "HNX", "Saigon Hanoi Securities", "Financial services"),
];

describe("pure directory functions", () => {
  it("ranks an exact symbol first, then prefixes", () => {
    expect(search(DATA, "fpt").map((s) => s.symbol)).toEqual(["FPT", "FPTS"]);
  });

  it("matches names and industries and honours the limit", () => {
    expect(search(DATA, "bank").map((s) => s.symbol)).toEqual(["VCB", "ACB"]);
    expect(search(DATA, "securities", { limit: 1 })).toHaveLength(1);
  });

  it("finds by symbol case-insensitively", () => {
    expect(getBySymbol(DATA, "vcb")?.companyName).toBe("Vietcombank");
    expect(getBySymbol(DATA, "XYZ")).toBeNull();
  });

  it("treats HOSE and HSX as the same exchange", () => {
    expect(getByExchange(DATA, "HOSE").map((s) => s.symbol)).toEqual(["FPT", "VCB", "ACB"]);
    expect(getByExchange(DATA, "HSX").map((s) => s.symbol)).toEqual(["FPT", "VCB", "ACB"]);
    expect(getByExchange(DATA, "hnx").map((s) => s.symbol)).toEqual(["FPTS", "SHS"]);
  });

  it("filters by industry substring", () => {
    expect(getByIndustry(DATA, "financial").map((s) => s.symbol)).toEqual(["FPTS", "SHS"]);
  });
});

// Restated from the v1 Directory tests on the shipped dataset.
describe("directory functions on data/symbols.json", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const symbols: SymbolInfo[] = require("../../data/symbols.json");

  it("has more than 1000 symbols with the full shape", () => {
    expect(symbols.length).toBeGreaterThan(1000);
    for (const key of ["symbol", "companyName", "companyNameEn", "exchange", "industry", "industryEn", "sector", "sectorEn", "icbCode", "vn30"]) {
      expect(symbols[0]).toHaveProperty(key);
    }
  });

  it("finds symbols case-insensitively and returns null for unknown ones", () => {
    expect(getBySymbol(symbols, "VNM")?.symbol).toBe("VNM");
    expect(getBySymbol(symbols, "vnm")?.symbol).toBe("VNM");
    expect(getBySymbol(symbols, "ZZZZZ")).toBeNull();
  });

  it("filters HSX and reads HOSE as the same list", () => {
    const hsx = getByExchange(symbols, "HSX");
    expect(hsx.length).toBeGreaterThan(0);
    expect(hsx.every((s) => s.exchange === "HSX")).toBe(true);
    expect(getByExchange(symbols, "HOSE")).toHaveLength(hsx.length);
  });

  it("filters industries in Vietnamese and English", () => {
    expect(getByIndustry(symbols, "Ngân hàng").length).toBeGreaterThan(0);
    expect(getByIndustry(symbols, "Banks").length).toBeGreaterThan(0);
  });

  it("ranks exact symbols first, keeps prefixes near the top and puts VN30 first within a tier", () => {
    expect(search(symbols, "VNM")[0].symbol).toBe("VNM");
    expect(search(symbols, "SSI")[0].symbol).toBe("SSI");
    const vn = search(symbols, "VN", { limit: 20 });
    expect(vn.slice(0, 5).map((s) => s.symbol)).toContain("VNM");
    const prefix = vn.filter((s) => s.symbol.toLowerCase().startsWith("vn"));
    const firstVn30 = prefix.findIndex((s) => s.vn30);
    const firstOther = prefix.findIndex((s) => !s.vn30);
    if (firstVn30 >= 0 && firstOther >= 0) expect(firstVn30).toBeLessThan(firstOther);
  });

  it("limits to 10 by default, honours a custom limit and finds nothing for nonsense", () => {
    expect(search(symbols, "a").length).toBeLessThanOrEqual(10);
    expect(search(symbols, "a", { limit: 5 }).length).toBeLessThanOrEqual(5);
    expect(search(symbols, "zzxxyy99")).toEqual([]);
  });
});
