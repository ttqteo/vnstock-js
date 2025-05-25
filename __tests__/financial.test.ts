import { Vnstock } from "../src/runtime";
import { saveTestOutput } from "./utils/testOutput";

describe("Stock Financial Data", () => {
  let vnstock: Vnstock;

  beforeEach(() => {
    vnstock = new Vnstock();
  });

  test("should fetch balance sheet data for a symbol", async () => {
    const result = await vnstock.stock.financials.balanceSheet({ symbol: "VCI" });
    saveTestOutput("balance-sheet", result);
    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("mapping");
    expect(result.mapping).toHaveProperty("ratio");
    expect(result.mapping).toHaveProperty("unit");
  });

  test("should fetch income statement data for a symbol", async () => {
    const result = await vnstock.stock.financials.incomeStatement({ symbol: "VCI" });
    saveTestOutput("income-statement", result);
    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("mapping");
    expect(result.mapping).toHaveProperty("ratio");
    expect(result.mapping).toHaveProperty("unit");
  });

  test("should fetch cash flow data for a symbol", async () => {
    const result = await vnstock.stock.financials.cashFlow({ symbol: "VCI" });
    saveTestOutput("cash-flow", result);
    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("mapping");
    expect(result.mapping).toHaveProperty("ratio");
    expect(result.mapping).toHaveProperty("unit");
  });
});
