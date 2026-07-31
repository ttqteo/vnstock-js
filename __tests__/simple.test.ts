import { stock, commodity, quickQuote, recentHistory, compareSymbols, topMovers } from "../src";

const RUN_INTEGRATION = process.env.INTEGRATION === "1";
const describeIntegration = RUN_INTEGRATION ? describe : describe.skip;

// BTMC times out from non-VN IPs. See the note in commodity.test.ts.
// Run with: npm run test:integration:vn
const RUN_VN = RUN_INTEGRATION && process.env.INTEGRATION_VN === "1";
const itVN = RUN_VN ? it : it.skip;

describeIntegration("Simple API (integration, INTEGRATION=1)", () => {
  describe("stock", () => {
    it("stock.quote returns normalized data", async () => {
      const data = await stock.quote({ ticker: "VCI", start: "2024-01-01", end: "2024-01-31" });
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      expect(data[0]).toHaveProperty("date");
      expect(data[0]).toHaveProperty("close");
      expect(data[0]).not.toHaveProperty("c");
    }, 30000);

    it("stock.index returns normalized data", async () => {
      const data = await stock.index({ index: "VNINDEX", start: "2024-01-01", end: "2024-01-31" });
      expect(Array.isArray(data)).toBe(true);
      expect(data[0]).toHaveProperty("date");
    }, 30000);

    it("stock.priceBoard returns normalized data", async () => {
      const data = await stock.priceBoard({ ticker: "VCI" });
      expect(Array.isArray(data)).toBe(true);
      expect(data[0]).toHaveProperty("symbol");
      expect(data[0]).toHaveProperty("price");
    }, 30000);

    it("stock.topGainers returns normalized data", async () => {
      const data = await stock.topGainers();
      expect(Array.isArray(data)).toBe(true);
      expect(data[0]).toHaveProperty("symbol");
    }, 30000);

    it("stock.company returns Company instance", async () => {
      const company = stock.company({ ticker: "VCI" });
      const profile = await company.profile();
      expect(profile).toHaveProperty("industry");
    }, 30000);

    it("stock.financials returns normalized data", async () => {
      const data = await stock.financials({ ticker: "VCI" });
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("symbol");
    }, 30000);
  });

  describe("commodity", () => {
    itVN("commodity.gold.priceBTMC returns normalized data (needs VN IP)", async () => {
      const data = await commodity.gold.priceBTMC();
      expect(Array.isArray(data)).toBe(true);
      expect(data[0]).toHaveProperty("buyPrice");
      // 60s: BTMC hangs intermittently; fetchWithRetry worst case is 3x15s + backoff (~48s)
    }, 60000);

    // Skipped: sjc.com.vn upstream returns 403. See issue tracker.
    it.skip("commodity.gold.priceSJC returns normalized data", async () => {
      const data = await commodity.gold.priceSJC();
      expect(Array.isArray(data)).toBe(true);
      expect(data[0]).toHaveProperty("buyPrice");
    }, 30000);

    it("commodity.exchange returns normalized data", async () => {
      const data = await commodity.exchange();
      expect(Array.isArray(data)).toBe(true);
      expect(data[0]).toHaveProperty("currencyCode");
    }, 30000);
  });

  describe("easy-mode", () => {
    it("quickQuote returns flat object with price + change", async () => {
      const q = await quickQuote("VCB");
      expect(q).not.toBeNull();
      expect(q).toHaveProperty("symbol", "VCB");
      expect(q).toHaveProperty("price");
      expect(q).toHaveProperty("volume");
    }, 30000);

    it("recentHistory returns N most-recent candles", async () => {
      const rows = await recentHistory("VCB", 10);
      expect(Array.isArray(rows)).toBe(true);
      expect(rows.length).toBeLessThanOrEqual(10);
      if (rows.length > 0) expect(rows[0]).toHaveProperty("close");
    }, 30000);

    it("compareSymbols returns array of flat quote objects", async () => {
      const rows = await compareSymbols(["VCB", "FPT"]);
      expect(Array.isArray(rows)).toBe(true);
      expect(rows.length).toBe(2);
      expect(rows[0]).toHaveProperty("symbol");
      expect(rows[0]).toHaveProperty("price");
    }, 30000);

    it("topMovers returns { gainers, losers }", async () => {
      const data = await topMovers();
      expect(data).toHaveProperty("gainers");
      expect(data).toHaveProperty("losers");
      expect(Array.isArray(data.gainers)).toBe(true);
      expect(Array.isArray(data.losers)).toBe(true);
    }, 30000);
  });
});
