import { Vnstock } from "../src/runtime";
import { saveTestOutput } from "./utils/testOutput";

const symbols = ["VCI", "MBB", "TCH"];

describe("Stock Historical Data", () => {
  let vnstock: Vnstock;

  beforeEach(() => {
    vnstock = new Vnstock();
  });

  test("should fetch historical quote data for multiple symbols and date range (1D)", async () => {
    const result = await vnstock.stock.quote.history({
      start: "2024-12-01",
      symbols,
      timeFrame: "1D",
    });
    saveTestOutput("historical-quote", result);
    expect(result).toHaveLength(3);
    result.forEach((item, index) => {
      expect(item).toHaveProperty("symbol", symbols.includes(item.symbol) ? item.symbol : symbols[index]);
      expect(item).toHaveProperty("o");
      expect(item).toHaveProperty("h");
      expect(item).toHaveProperty("l");
      expect(item).toHaveProperty("c");
      expect(item).toHaveProperty("v");
      expect(item).toHaveProperty("t");
    });
  });

  test("should fetch historical quote data for VNINDEX (1D)", async () => {
    const result = await vnstock.stock.quote.history({
      start: "2024-12-01",
      symbols: ["VNINDEX"],
      timeFrame: "1D",
    });
    saveTestOutput("historical-quote-vnindex", result);
    expect(result).toHaveLength(1);
    result.forEach((item, index) => {
      expect(item).toHaveProperty("symbol", "VNINDEX");
      expect(item).toHaveProperty("o");
      expect(item).toHaveProperty("h");
      expect(item).toHaveProperty("l");
      expect(item).toHaveProperty("c");
      expect(item).toHaveProperty("v");
      expect(item).toHaveProperty("t");
    });
  });
});
