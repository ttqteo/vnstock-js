import Company from "../src/core/stock/company";
import { Vnstock } from "../src/runtime";
import { saveTestOutputTicker } from "./utils/testOutput";

const testTickers = ["VCI", "MBB", "TCH"];

describe("Company Data", () => {
  testTickers.forEach((ticker) => {
    describe(`Testing ${ticker}`, () => {
      let vnstock: Vnstock;

      beforeEach(() => {
        vnstock = new Vnstock();
        vnstock.stock.company = new Company(ticker);
      });

      test("should fetch company overview", async () => {
        const result = await vnstock.stock.company.overview();
        saveTestOutputTicker("company-overview", ticker, result);

        // Basic structure validation
        expect(result).toHaveProperty("TickerPriceInfo");
        expect(result).toHaveProperty("CompanyListingInfo");
        expect(result).toHaveProperty("OrganizationManagers");
        expect(result).toHaveProperty("OrganizationShareHolders");
        expect(result).toHaveProperty("OrganizationEvents");

        // Validate ticker matches
        expect(result.TickerPriceInfo.ticker).toBe(ticker);
      });

      test("should fetch company profile", async () => {
        const result = await vnstock.stock.company.profile();
        saveTestOutputTicker("company-profile", ticker, result);
        expect(result).toHaveProperty("id");
        expect(result).toHaveProperty("issueShare");
        expect(result).toHaveProperty("companyProfile");
      });

      test("should fetch company shareholders", async () => {
        const result = await vnstock.stock.company.shareholders();
        saveTestOutputTicker("company-shareholders", ticker, result);
        expect(Array.isArray(result)).toBe(true);
        if (result.length > 0) {
          expect(result[0]).toHaveProperty("ownerFullName");
          expect(result[0]).toHaveProperty("percentage");
        }
      });

      test("should fetch company subsidiaries", async () => {
        const result = await vnstock.stock.company.subsidiaries();
        saveTestOutputTicker("company-subsidiaries", ticker, result);
        expect(Array.isArray(result)).toBe(true);
        if (result.length > 0) {
          expect(result[0]).toHaveProperty("subOrganCode");
          expect(result[0]).toHaveProperty("percentage");
        }
      });

      test("should fetch company officers", async () => {
        const result = await vnstock.stock.company.officers();
        saveTestOutputTicker("company-officers", ticker, result);
        expect(Array.isArray(result)).toBe(true);
        if (result.length > 0) {
          expect(result[0]).toHaveProperty("fullName");
          expect(result[0]).toHaveProperty("positionName");
        }
      });

      test("should fetch company events", async () => {
        const result = await vnstock.stock.company.events();
        saveTestOutputTicker("company-events", ticker, result);
        expect(Array.isArray(result)).toBe(true);
        if (result.length > 0) {
          expect(result[0]).toHaveProperty("eventTitle");
          expect(result[0]).toHaveProperty("publicDate");
        }
      });

      test("should fetch company news", async () => {
        const result = await vnstock.stock.company.news();
        saveTestOutputTicker("company-news", ticker, result);
        expect(Array.isArray(result)).toBe(true);
        if (result.length > 0) {
          expect(result[0]).toHaveProperty("newsTitle");
          expect(result[0]).toHaveProperty("newsShortContent");
        }
      });

      test("should fetch company dividends", async () => {
        const result = await vnstock.stock.company.dividends();
        saveTestOutputTicker("company-dividends", ticker, result);
        expect(Array.isArray(result)).toBe(true);
        if (result.length > 0) {
          expect(result[0]).toHaveProperty("eventTitle");
          expect(result[0]).toHaveProperty("ratio");
        }
      });

      test("should fetch insider deals", async () => {
        const result = await vnstock.stock.company.insider_deals();
        saveTestOutputTicker("company-insider-deals", ticker, result);
        expect(Array.isArray(result)).toBe(true);
        if (result.length > 0) {
          expect(result[0]).toHaveProperty("eventTitle");
          expect(result[0]).toHaveProperty("publicDate");
        }
      });
    });
  });
});
