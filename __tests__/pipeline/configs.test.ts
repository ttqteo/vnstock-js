import { applyTransform } from "../../src/pipeline/transform";
import { transformQuoteHistory } from "../../src/pipeline/transform/configs/quote";
import { tickerChangeTransformConfig } from "../../src/pipeline/transform/configs/trading";

describe("transformQuoteHistory", () => {
  it("transforms raw ChartData to QuoteHistory[]", () => {
    const rawChartData = {
      symbol: "VCI",
      o: [25500, 25800],
      h: [26000, 26200],
      l: [25000, 25300],
      c: [25800, 26100],
      v: [1000000, 1200000],
      t: [1705276800, 1705363200],
      accumulatedVolume: [1000000, 2200000],
      accumulatedValue: [25500000, 57300000],
      minBatchTruncTime: 1705276800,
    };

    const result = transformQuoteHistory(rawChartData);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      date: "2024-01-15",
      open: 25.5,
      high: 26.0,
      low: 25.0,
      close: 25.8,
      volume: 1000000,
    });
    expect(result[1]).toEqual({
      date: "2024-01-16",
      open: 25.8,
      high: 26.2,
      low: 25.3,
      close: 26.1,
      volume: 1200000,
    });
  });

  it("returns empty array for empty data", () => {
    const rawChartData = {
      symbol: "VCI",
      o: [], h: [], l: [], c: [], v: [], t: [],
      accumulatedVolume: [], accumulatedValue: [],
      minBatchTruncTime: 0,
    };
    const result = transformQuoteHistory(rawChartData);
    expect(result).toEqual([]);
  });
});

describe("tickerChangeTransformConfig", () => {
  it("transforms raw TickerChange to normalized object", () => {
    const raw = {
      stockCode: "FPT",
      lastPrice1DayAgo: 120000,
      lastPrice5DaysAgo: 118000,
      lastPrice20DaysAgo: 115000,
      group: "HOSE",
      marketCap: 95000000,
      topStockType: "GAINER_1_D",
      liquidity: 5000000,
      vn30: true,
      hnx30: false,
    };

    const result = applyTransform(raw, tickerChangeTransformConfig);

    expect(result.symbol).toBe("FPT");
    expect(result.price1DayAgo).toBe(120);
    expect(result.price5DaysAgo).toBe(118);
    expect(result.price20DaysAgo).toBe(115);
    expect(result.exchange).toBe("HOSE");
    expect(result.marketCap).toBe(95000000);
  });
});
