import vnstock from "../src";

// Skipped: VCI GraphQL endpoint (trading.vietcap.com.vn/data-mt/graphql)
// returns HTTP 200 with empty body {} since ~2026-04. Planned migration to
// KBS data source in v1.4.
describe.skip("Financial", () => {
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
