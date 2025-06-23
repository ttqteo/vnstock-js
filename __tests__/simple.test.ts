import { stock, commodity } from "../src/index";
import { saveTestOutput } from "./utils/testOutput";

const testTickers = ["VCI", "VCB", "TCB"];

describe("Simple API", () => {
  describe("Stock API", () => {
    test("should fetch stock price history", async () => {
      const result = await stock.price(testTickers[0], "2024-01-01");
      saveTestOutput("simple-stock-price", result);

      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty("symbol", testTickers[0]);
        expect(result[0]).toHaveProperty("o");
        expect(result[0]).toHaveProperty("h");
        expect(result[0]).toHaveProperty("l");
        expect(result[0]).toHaveProperty("c");
        expect(result[0]).toHaveProperty("v");
        expect(result[0]).toHaveProperty("t");
      }
    });

    test("should fetch index price history", async () => {
      const result = await stock.index("VNINDEX", "2024-01-01");
      saveTestOutput("simple-index-price", result);

      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty("symbol", "VNINDEX");
        expect(result[0]).toHaveProperty("o");
        expect(result[0]).toHaveProperty("h");
        expect(result[0]).toHaveProperty("l");
        expect(result[0]).toHaveProperty("c");
        expect(result[0]).toHaveProperty("v");
        expect(result[0]).toHaveProperty("t");
      }
    });

    test("should throw error for invalid index symbol", async () => {
      await expect(stock.index("INVALID", "2024-01-01")).rejects.toThrow("Invalid index symbol");
    });

    test("should fetch company overview", async () => {
      const result = await stock.company(testTickers[1]);
      saveTestOutput("simple-company-overview", result);

      expect(result).toHaveProperty("TickerPriceInfo");
      expect(result).toHaveProperty("CompanyListingInfo");
      expect(result).toHaveProperty("OrganizationManagers");
      expect(result).toHaveProperty("OrganizationShareHolders");
      expect(result).toHaveProperty("OrganizationEvents");
      expect(result.TickerPriceInfo.ticker).toBe(testTickers[1]);
    });

    test("should fetch financial data", async () => {
      const result = await stock.financials(testTickers[0]);
      saveTestOutput("simple-financials", result);

      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("mapping");
    });
  });

  describe("Commodity API", () => {
    test("should fetch BTMC gold price", async () => {
      const result = await commodity.gold.priceBTMC();
      saveTestOutput("simple-gold-btmc", result);

      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty("type");
        expect(result[0]).toHaveProperty("buy");
        expect(result[0]).toHaveProperty("sell");
      }
    });

    test("should fetch GiaVangNet gold price", async () => {
      const result = await commodity.gold.priceGiaVangNet();
      saveTestOutput("simple-gold-giavangnet", result);

      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty("type");
        expect(result[0]).toHaveProperty("buy");
        expect(result[0]).toHaveProperty("sell");
      }
    });

    test("should fetch SJC gold price", async () => {
      const result = await commodity.gold.priceSJC();
      saveTestOutput("simple-gold-sjc", result);

      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty("type");
        expect(result[0]).toHaveProperty("buy");
        expect(result[0]).toHaveProperty("sell");
      }
    });

    test("should fetch exchange rates", async () => {
      const result = await commodity.exchange();
      saveTestOutput("simple-exchange-rates", result);

      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty("currency");
        expect(result[0]).toHaveProperty("buy");
        expect(result[0]).toHaveProperty("sell");
      }
    });
  });
});
