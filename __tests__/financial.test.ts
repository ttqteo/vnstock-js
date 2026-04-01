import vnstock from "../src";

describe("Financial", () => {
  it("should return normalized balance sheet", async () => {
    const data = await vnstock.stock.financials.balanceSheet({
      symbol: "VCI",
      period: "quarter",
    });

    expect(data).toHaveProperty("data");
    expect(data).toHaveProperty("mapping");
    expect(data.data).toHaveProperty("symbol");
    expect(data.data).not.toHaveProperty("ticker");
  }, 30000);

  it("should return normalized income statement", async () => {
    const data = await vnstock.stock.financials.incomeStatement({
      symbol: "VCI",
      period: "year",
    });

    expect(data).toHaveProperty("data");
    expect(data.data).toHaveProperty("symbol");
  }, 30000);

  it("should return normalized cash flow", async () => {
    const data = await vnstock.stock.financials.cashFlow({
      symbol: "VCI",
    });

    expect(data).toHaveProperty("data");
    expect(data.data).toHaveProperty("symbol");
  }, 30000);
});
