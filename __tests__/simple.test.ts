import { stock, commodity } from "../src";

describe("Simple API", () => {
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
    it("commodity.gold.priceBTMC returns normalized data", async () => {
      const data = await commodity.gold.priceBTMC();
      expect(Array.isArray(data)).toBe(true);
      expect(data[0]).toHaveProperty("buyPrice");
    }, 30000);

    it("commodity.gold.priceSJC returns normalized data", async () => {
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
});
