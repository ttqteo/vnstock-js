import { Directory } from "../src/core/listing/directory";
import { _reset } from "../src/data";
import { initWithFixtures } from "./helpers/init-data";

jest.mock("axios");
import axios from "axios";
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("Directory", () => {
  beforeAll(async () => {
    await initWithFixtures(mockedAxios);
  });

  describe("all()", () => {
    it("returns >1000 items with correct shape", () => {
      const data = Directory.all();
      expect(data.length).toBeGreaterThan(1000);
      expect(data[0]).toHaveProperty("symbol");
      expect(data[0]).toHaveProperty("companyName");
      expect(data[0]).toHaveProperty("companyNameEn");
      expect(data[0]).toHaveProperty("exchange");
      expect(data[0]).toHaveProperty("industry");
      expect(data[0]).toHaveProperty("industryEn");
      expect(data[0]).toHaveProperty("sector");
      expect(data[0]).toHaveProperty("sectorEn");
      expect(data[0]).toHaveProperty("icbCode");
      expect(data[0]).toHaveProperty("vn30");
    });
  });

  describe("getBySymbol()", () => {
    it('returns exact match for "VNM"', () => {
      const result = Directory.getBySymbol("VNM");
      expect(result).not.toBeNull();
      expect(result!.symbol).toBe("VNM");
    });

    it('returns null for "ZZZZZ"', () => {
      expect(Directory.getBySymbol("ZZZZZ")).toBeNull();
    });

    it('is case-insensitive — "vnm" works', () => {
      const result = Directory.getBySymbol("vnm");
      expect(result).not.toBeNull();
      expect(result!.symbol).toBe("VNM");
    });
  });

  describe("getByExchange()", () => {
    it('filters by "HSX" correctly', () => {
      const data = Directory.getByExchange("HSX");
      expect(data.length).toBeGreaterThan(0);
      data.forEach((item) => {
        expect(item.exchange).toBe("HSX");
      });
    });

    it('accepts "HOSE" as alias for "HSX"', () => {
      const hose = Directory.getByExchange("HOSE");
      const hsx = Directory.getByExchange("HSX");
      expect(hose.length).toBe(hsx.length);
      expect(hose.length).toBeGreaterThan(0);
    });
  });

  describe("getByIndustry()", () => {
    it('filters Vietnamese industry "Ngân hàng"', () => {
      const data = Directory.getByIndustry("Ngân hàng");
      expect(data.length).toBeGreaterThan(0);
      data.forEach((item) => {
        const match =
          item.industry.toLowerCase().indexOf("ngân hàng") !== -1 ||
          item.industryEn.toLowerCase().indexOf("ngân hàng") !== -1;
        expect(match).toBe(true);
      });
    });

    it('filters English industry "Banks"', () => {
      const data = Directory.getByIndustry("Banks");
      expect(data.length).toBeGreaterThan(0);
      data.forEach((item) => {
        const match =
          item.industry.toLowerCase().indexOf("banks") !== -1 ||
          item.industryEn.toLowerCase().indexOf("banks") !== -1;
        expect(match).toBe(true);
      });
    });
  });

  describe("search()", () => {
    it('"VNM" — exact match ranks first', () => {
      const results = Directory.search("VNM");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].symbol).toBe("VNM");
    });

    it('"SSI" — exact match ranks first', () => {
      const results = Directory.search("SSI");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].symbol).toBe("SSI");
    });

    it('"VN" — VNM in top 5 (startsWith)', () => {
      const results = Directory.search("VN", { limit: 20 });
      const top5 = results.slice(0, 5).map((r) => r.symbol);
      expect(top5).toContain("VNM");
    });

    it("VN30 boost — VN30 stocks rank higher within same tier", () => {
      const results = Directory.search("VN");
      // Among startsWith matches, VN30 items should come first
      const startsWith = results.filter(
        (r) => r.symbol.toLowerCase().indexOf("vn") === 0
      );
      if (startsWith.length >= 2) {
        const vn30Items = startsWith.filter((r) => r.vn30);
        const nonVn30Items = startsWith.filter((r) => !r.vn30);
        if (vn30Items.length > 0 && nonVn30Items.length > 0) {
          // First VN30 item should appear before first non-VN30 item
          const firstVn30Idx = results.indexOf(vn30Items[0]);
          const firstNonVn30Idx = results.indexOf(nonVn30Items[0]);
          expect(firstVn30Idx).toBeLessThan(firstNonVn30Idx);
        }
      }
    });

    it("default limit is 10", () => {
      const results = Directory.search("a");
      expect(results.length).toBeLessThanOrEqual(10);
    });

    it("custom limit works", () => {
      const results = Directory.search("a", { limit: 5 });
      expect(results.length).toBeLessThanOrEqual(5);
    });

    it("returns empty for nonsense query", () => {
      const results = Directory.search("zzxxyy99");
      expect(results).toEqual([]);
    });
  });
});

describe("Directory — not initialized", () => {
  it("throws NotInitializedError when called before init()", () => {
    _reset();
    expect(() => Directory.all()).toThrow(/not initialized/i);
  });
});
