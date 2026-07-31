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

import {
  boardToResult,
  isBoardField,
  mergeRatios,
  pool,
} from "../src/core/stock/screening";
import Screening from "../src/core/stock/screening";
import { InvalidParameterError } from "../src/errors";
import { PriceBoardItem } from "../src/models/normalized";

function boardItem(over: Partial<PriceBoardItem>): PriceBoardItem {
  return {
    symbol: "AAA",
    companyName: "Cong ty AAA",
    companyNameEn: "",
    exchange: "HOSE",
    ceilingPrice: 11,
    floorPrice: 9,
    referencePrice: 10,
    price: 11,
    matchVolume: 0,
    totalVolume: 1000,
    totalValue: 5000,
    averagePrice: 10,
    highestPrice: 0,
    lowestPrice: 0,
    foreignBuyVolume: 0,
    foreignSellVolume: 0,
    bidPrices: [],
    askPrices: [],
    ...over,
  } as PriceBoardItem;
}

describe("isBoardField", () => {
  // Filtering on a board field costs nothing; a ratio field costs one request
  // per symbol, which is what draws a 429 from the upstream.
  it("recognises the fields the price board already carries", () => {
    expect(isBoardField("price")).toBe(true);
    expect(isBoardField("volume")).toBe(true);
  });

  it("treats ratios as expensive", () => {
    expect(isBoardField("pe")).toBe(false);
    expect(isBoardField("roe")).toBe(false);
  });
});

describe("pool", () => {
  it("never exceeds the concurrency it was given", async () => {
    let inFlight = 0;
    let peak = 0;
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    await pool(items, 3, async (n) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
      return n;
    });

    expect(peak).toBeLessThanOrEqual(3);
  });

  it("keeps results aligned with the input order", async () => {
    const out = await pool([1, 2, 3], 2, async (n) => {
      await new Promise((r) => setTimeout(r, (4 - n) * 5));
      return n * 10;
    });
    expect(out).toEqual([10, 20, 30]);
  });

  it("handles an empty list", async () => {
    expect(await pool([], 5, async (x) => x)).toEqual([]);
  });
});

describe("boardToResult", () => {
  it("derives change against the reference price", () => {
    const r = boardToResult(boardItem({ price: 11, referencePrice: 10 }));
    expect(r.priceChange).toBe(1);
    expect(r.changePercent).toBe(10);
  });

  it("converts turnover from trieu VND to ty VND", () => {
    const r = boardToResult(boardItem({ totalValue: 5000 }));
    expect(r.value).toBe(5);
  });

  it("leaves ratio fields null until they are fetched", () => {
    const r = boardToResult(boardItem({}));
    expect(r.pe).toBeNull();
    expect(r.roe).toBeNull();
    expect(r.marketCap).toBe(0);
  });
});

describe("mergeRatios", () => {
  it("converts marketCap from VND to ty VND", () => {
    const row = boardToResult(boardItem({}));
    mergeRatios(row, { marketCap: 129_728_830_738_950, pe: 8.27 });
    expect(row.marketCap).toBe(129728.831);
    expect(row.pe).toBe(8.27);
  });

  it("accepts either spelling of debt to equity", () => {
    const row = boardToResult(boardItem({}));
    mergeRatios(row, { debtPerEquity: 1.5 });
    expect(row.debtToEquity).toBe(1.5);
  });

  it("leaves the row untouched when ratios are unavailable", () => {
    const row = boardToResult(boardItem({}));
    mergeRatios(row, null);
    expect(row.pe).toBeNull();
  });

  it("rejects non-finite numbers rather than storing NaN", () => {
    const row = boardToResult(boardItem({}));
    mergeRatios(row, { pe: NaN, pb: "n/a" });
    expect(row.pe).toBeNull();
    expect(row.pb).toBeNull();
  });
});

describe("Screening.screen universe", () => {
  const adapter: any = {
    fetchSymbolsByGroup: jest.fn(),
    fetchPriceBoard: jest.fn(),
    fetchSymbolsByIndustries: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  // Ratios cost one request per symbol, so screening the whole market in one
  // call is what draws a 429. The universe has to be stated.
  it("requires a group or an exchange", async () => {
    await expect(new Screening(adapter).screen({})).rejects.toThrow(InvalidParameterError);
    expect(adapter.fetchSymbolsByGroup).not.toHaveBeenCalled();
  });

  it("does not fetch ratios when every filter hits the price board", async () => {
    adapter.fetchSymbolsByGroup.mockResolvedValue([{ symbol: "AAA" }]);
    adapter.fetchPriceBoard.mockResolvedValue([boardItem({ symbol: "AAA", price: 11 })]);
    adapter.fetchSymbolsByIndustries.mockResolvedValue([]);

    const rows = await new Screening(adapter).screen({
      group: "VN30",
      filters: [{ field: "price", operator: ">", value: 5 }],
    });

    expect(rows.length).toBe(1);
    expect(rows[0].pe).toBeNull();
  });

  it("returns early for an empty universe without touching the board", async () => {
    adapter.fetchSymbolsByGroup.mockResolvedValue([]);
    const rows = await new Screening(adapter).screen({ group: "VN30" });
    expect(rows).toEqual([]);
    expect(adapter.fetchPriceBoard).not.toHaveBeenCalled();
  });
});
