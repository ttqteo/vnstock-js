import { Vnstock } from "../src/runtime";
import { saveTestOutput } from "./utils/testOutput";

const symbols = ["MBB", "TCH"];

describe("Stock Trading Data", () => {
  let vnstock: Vnstock;

  beforeEach(() => {
    vnstock = new Vnstock();
  });

  test("should fetch price board data for given symbols", async () => {
    const result = await vnstock.stock.trading.priceBoard(symbols);
    saveTestOutput("price-board", result);
    expect(result).toHaveLength(symbols.length);
    result.forEach((item, index) => {
      expect(item.listingInfo.symbol).toBe(symbols[index]);
      expect(item.listingInfo).toHaveProperty("code");
      expect(item.listingInfo).toHaveProperty("symbol");
      expect(item.listingInfo).toHaveProperty("ceiling");
      expect(item.listingInfo).toHaveProperty("floor");
      expect(item.listingInfo).toHaveProperty("refPrice");
    });
  });

  test("should fetch top gaining stocks", async () => {
    const result = await vnstock.stock.trading.topGainers({ timeFrame: "1D" });
    saveTestOutput("top-gainers", result);
    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      const firstItem = result[0];
      expect(firstItem).toHaveProperty("stockCode");
      expect(firstItem).toHaveProperty("group");
    }
  });

  test("should fetch top losing stocks", async () => {
    const result = await vnstock.stock.trading.topLosers({ timeFrame: "1D" });
    saveTestOutput("top-losers", result);
    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      const firstItem = result[0];
      expect(firstItem).toHaveProperty("stockCode");
      expect(firstItem).toHaveProperty("group");
    }
  });
});
