import { Vnstock } from "../src/runtime";
import { saveTestOutput } from "./utils/testOutput";

const symbols = ["MBB", "TCH"];

describe("Stock Historical Data", () => {
  let vnstock: Vnstock;

  beforeEach(() => {
    vnstock = new Vnstock();
  });

  test("should fetch historical quote data for given symbols and date range", async () => {
    const result = await vnstock.stock.quote.history({
      start: "2024-12-01",
      symbols,
    });
    saveTestOutput("historical-quote", result);
    expect(result).toHaveLength(2);
    result.forEach((item, index) => {
      expect(item).toHaveProperty("symbol", symbols[index]);
      expect(item).toHaveProperty("o");
      expect(item).toHaveProperty("h");
      expect(item).toHaveProperty("l");
      expect(item).toHaveProperty("c");
      expect(item).toHaveProperty("v");
      expect(item).toHaveProperty("t");
    });
  });
});
