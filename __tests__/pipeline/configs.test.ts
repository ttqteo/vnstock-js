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
      symbol: "VCI",
      date: "2024-01-15",
      open: 25.5,
      high: 26.0,
      low: 25.0,
      close: 25.8,
      volume: 1000000,
      value: 25500000,
    });
    expect(result[1]).toEqual({
      symbol: "VCI",
      date: "2024-01-16",
      open: 25.8,
      high: 26.2,
      low: 25.3,
      close: 26.1,
      volume: 1200000,
      value: 57300000,
    });
  });

  it("carries symbol on every bar so batched multi-symbol history is demuxable", () => {
    const vci = transformQuoteHistory({
      symbol: "VCI",
      o: [25500], h: [26000], l: [25000], c: [25800], v: [1000000], t: [1705276800],
    });
    const fpt = transformQuoteHistory({
      symbol: "FPT",
      o: [120000], h: [121000], l: [119000], c: [120500], v: [2000000], t: [1705276800],
    });
    const merged = [...vci, ...fpt];
    expect(merged.map((r) => r.symbol)).toEqual(["VCI", "FPT"]);
  });

  it("leaves symbol undefined when raw has no symbol field", () => {
    const result = transformQuoteHistory({
      o: [25500], h: [26000], l: [25000], c: [25800], v: [1000000], t: [1705276800],
    });
    expect(result[0].symbol).toBeUndefined();
  });

  it("maps accumulatedValue to value (đơn vị triệu VND, không scale)", () => {
    const rawChartData = {
      symbol: "VCI",
      o: [25500], h: [26000], l: [25000], c: [25800],
      v: [1000000], t: [1705276800],
      accumulatedValue: [90482.55],
    };
    const result = transformQuoteHistory(rawChartData);
    expect(result[0].value).toBe(90482.55);
  });

  it("leaves value undefined when accumulatedValue is absent", () => {
    const rawChartData = {
      symbol: "VCI",
      o: [25500], h: [26000], l: [25000], c: [25800],
      v: [1000000], t: [1705276800],
    };
    const result = transformQuoteHistory(rawChartData);
    expect(result[0].value).toBeUndefined();
    expect("value" in result[0]).toBe(true);
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
