import { Vnstock } from "../src/runtime";
import { saveTestOutput } from "./utils/testOutput";

const symbols = ["MBB", "TCH"];

describe("Stock Listing Data", () => {
  let vnstock: Vnstock;

  beforeEach(() => {
    vnstock = new Vnstock();
  });

  test("should fetch all available stock symbols", async () => {
    const result = await vnstock.stock.listing.allSymbols();
    saveTestOutput("all-symbols", result);
    expect(result).toHaveProperty("record_count");
    expect(result).toHaveProperty("ticker_info");
    expect(Array.isArray(result.ticker_info)).toBe(true);
    expect(result.ticker_info.length).toBeGreaterThan(0);
  });

  test("should fetch symbols grouped by exchange", async () => {
    const result = await vnstock.stock.listing.symbolsByExchange();
    saveTestOutput("symbols-by-exchange", result);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    result.forEach((symbol) => {
      expect(symbol).toHaveProperty("symbol");
      expect(symbol).toHaveProperty("type");
      expect(symbol).toHaveProperty("board");
      expect(symbol).toHaveProperty("organName");
    });
  });

  test("should fetch symbols grouped by industries", async () => {
    const result = await vnstock.stock.listing.symbolsByIndustries();
    saveTestOutput("symbols-by-industries", result);
    expect(result).toHaveProperty("data");
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data.length).toBeGreaterThan(0);
    result.data.forEach((company: { ticker: string; organName: string; icbName3: string }) => {
      expect(company).toHaveProperty("ticker");
      expect(company).toHaveProperty("organName");
      expect(company).toHaveProperty("icbName3");
    });
  });

  test("should fetch industry ICB codes", async () => {
    const result = await vnstock.stock.listing.industriesIcb();
    saveTestOutput("industry-icb-codes", result);
    expect(result).toHaveProperty("data");
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data.length).toBeGreaterThan(0);
    result.data.forEach((icb: { icbCode: string; level: string; icbName: string }) => {
      expect(icb).toHaveProperty("icbCode");
      expect(icb).toHaveProperty("level");
      expect(icb).toHaveProperty("icbName");
    });
  });

  test("should fetch symbols by group (default VN30)", async () => {
    const result = await vnstock.stock.listing.symbolsByGroup({});
    saveTestOutput("symbols-by-group", result);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });
});
