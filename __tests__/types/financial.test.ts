import { FinancialStatement } from "../../src/models/normalized";

describe("FinancialStatement typing", () => {
  it("accepts strict base fields", () => {
    const stmt: FinancialStatement = {
      symbol: "VNM",
      year: 2025,
      quarter: 4,
      updatedAt: "2025-12-31",
      revenue: 1000,
      grossProfit: 500,
      netIncome: 200,
    };
    expect(stmt.symbol).toBe("VNM");
    expect(stmt.revenue).toBe(1000);
  });

  it("accepts extra dynamic fields", () => {
    const stmt: FinancialStatement = {
      symbol: "FPT",
      year: 2025,
      quarter: 3,
      updatedAt: "2025-09-30",
      customRatio: 1.5,
    };
    expect(stmt.customRatio).toBe(1.5);
  });
});
