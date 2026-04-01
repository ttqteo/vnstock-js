import { applyFilters } from "../src/core/stock/screening";
import { ScreenFilter } from "../src/models/screening";

describe("applyFilters", () => {
  const stocks = [
    { symbol: "FPT", pe: 12, roe: 0.22, marketCap: 95000, price: 120 },
    { symbol: "VNM", pe: 18, roe: 0.30, marketCap: 150000, price: 80 },
    { symbol: "MBB", pe: 8, roe: 0.18, marketCap: 60000, price: 25 },
    { symbol: "TCB", pe: 6, roe: 0.15, marketCap: 80000, price: 30 },
  ];

  it("filters with < operator", () => {
    const filters: ScreenFilter[] = [{ field: "pe", operator: "<", value: 15 }];
    const result = applyFilters(stocks, filters);
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.symbol)).toEqual(["FPT", "MBB", "TCB"]);
  });

  it("filters with > operator", () => {
    const filters: ScreenFilter[] = [{ field: "roe", operator: ">", value: 0.20 }];
    const result = applyFilters(stocks, filters);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.symbol)).toEqual(["FPT", "VNM"]);
  });

  it("filters with multiple criteria (AND)", () => {
    const filters: ScreenFilter[] = [
      { field: "pe", operator: "<", value: 15 },
      { field: "marketCap", operator: ">", value: 70000 },
    ];
    const result = applyFilters(stocks, filters);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.symbol)).toEqual(["FPT", "TCB"]);
  });

  it("filters with = operator", () => {
    const filters: ScreenFilter[] = [{ field: "symbol", operator: "=", value: "FPT" }];
    const result = applyFilters(stocks, filters);
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe("FPT");
  });

  it("filters with >= operator", () => {
    const filters: ScreenFilter[] = [{ field: "pe", operator: ">=", value: 12 }];
    const result = applyFilters(stocks, filters);
    expect(result).toHaveLength(2);
  });

  it("filters with <= operator", () => {
    const filters: ScreenFilter[] = [{ field: "pe", operator: "<=", value: 8 }];
    const result = applyFilters(stocks, filters);
    expect(result).toHaveLength(2);
  });

  it("returns all when no filters", () => {
    const result = applyFilters(stocks, []);
    expect(result).toHaveLength(4);
  });

  it("sorts by field desc", () => {
    const result = applyFilters(stocks, [], { sortBy: "roe", order: "desc" });
    expect(result[0].symbol).toBe("VNM");
    expect(result[3].symbol).toBe("TCB");
  });

  it("sorts by field asc", () => {
    const result = applyFilters(stocks, [], { sortBy: "pe", order: "asc" });
    expect(result[0].symbol).toBe("TCB");
  });

  it("limits results", () => {
    const result = applyFilters(stocks, [], { limit: 2 });
    expect(result).toHaveLength(2);
  });
});
