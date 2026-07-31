import {
  averageLiquidity,
  classifyRegime,
  computeBreadth,
  computeLiquidity,
  computeMarketForeignFlow,
  computeSymbolForeignFlow,
  liquiditySignal,
  toIndexSnapshot,
} from "../../src/core/market/aggregate";
import { PriceBoardItem, QuoteHistory } from "../../src/models/normalized";

function board(over: Partial<PriceBoardItem>): PriceBoardItem {
  return {
    symbol: "AAA",
    companyName: "",
    companyNameEn: "",
    exchange: "HOSE",
    ceilingPrice: 11,
    floorPrice: 9,
    referencePrice: 10,
    price: 10,
    matchVolume: 0,
    totalVolume: 0,
    totalValue: 0,
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

function bar(over: Partial<QuoteHistory>): QuoteHistory {
  return {
    date: "2026-07-30",
    open: 100,
    high: 100,
    low: 100,
    close: 100,
    volume: 0,
    ...over,
  } as QuoteHistory;
}

describe("computeBreadth", () => {
  it("buckets symbols by price against reference", () => {
    const result = computeBreadth(
      [
        board({ symbol: "UP", price: 11 }),
        board({ symbol: "DOWN", price: 9.5 }),
        board({ symbol: "FLAT", price: 10 }),
      ],
      "HOSE",
      "2026-07-30"
    );

    expect(result.advancing).toBe(1);
    expect(result.declining).toBe(1);
    expect(result.unchanged).toBe(1);
    expect(result.total).toBe(3);
  });

  it("counts ceiling and floor separately from advancing and declining", () => {
    const result = computeBreadth(
      [board({ symbol: "C", price: 11 }), board({ symbol: "F", price: 9 })],
      "HOSE",
      "2026-07-30"
    );

    expect(result.ceiling).toBe(1);
    expect(result.floor).toBe(1);
    // A ceiling symbol is still an advancing one.
    expect(result.advancing).toBe(1);
    expect(result.declining).toBe(1);
  });

  it("excludes symbols that have not traded rather than calling them unchanged", () => {
    const result = computeBreadth(
      [board({ symbol: "LIVE", price: 11 }), board({ symbol: "DEAD", price: 0 })],
      "HOSE",
      "2026-07-30"
    );

    expect(result.total).toBe(1);
    expect(result.unchanged).toBe(0);
  });

  it("reports null ratio instead of Infinity when nothing declined", () => {
    const result = computeBreadth([board({ price: 11 })], "HOSE", "2026-07-30");
    expect(result.advanceDeclineRatio).toBeNull();
  });
});

describe("computeSymbolForeignFlow", () => {
  it("converts volume x averagePrice into ty VND", () => {
    // 1,000,000 shares at 50 nghin VND = 50 ty VND
    const flow = computeSymbolForeignFlow(
      board({ symbol: "VCB", averagePrice: 50, foreignBuyVolume: 1_000_000 }),
      "2026-07-30"
    );

    expect(flow.buyValue).toBe(50);
    expect(flow.sellValue).toBe(0);
    expect(flow.netValue).toBe(50);
    expect(flow.unit).toBe("tyVND");
  });

  it("nets buy against sell", () => {
    const flow = computeSymbolForeignFlow(
      board({ averagePrice: 10, foreignBuyVolume: 3_000_000, foreignSellVolume: 1_000_000 }),
      "2026-07-30"
    );

    expect(flow.netVolume).toBe(2_000_000);
    expect(flow.netValue).toBe(20);
  });

  it("falls back to match price when averagePrice is missing", () => {
    const flow = computeSymbolForeignFlow(
      board({ averagePrice: 0, price: 20, foreignBuyVolume: 1_000_000 }),
      "2026-07-30"
    );
    expect(flow.buyValue).toBe(20);
  });
});

describe("computeMarketForeignFlow", () => {
  const items = [
    board({ symbol: "BUY1", averagePrice: 10, foreignBuyVolume: 5_000_000 }),
    board({ symbol: "BUY2", averagePrice: 10, foreignBuyVolume: 2_000_000 }),
    board({ symbol: "SELL1", averagePrice: 10, foreignSellVolume: 4_000_000 }),
    board({ symbol: "QUIET" }),
  ];

  it("aggregates the whole board", () => {
    const result = computeMarketForeignFlow(items, "HOSE", "2026-07-30");

    expect(result.buyValue).toBe(70);
    expect(result.sellValue).toBe(40);
    expect(result.netValue).toBe(30);
  });

  it("ranks top net buy descending and top net sell most-negative first", () => {
    const result = computeMarketForeignFlow(items, "HOSE", "2026-07-30");

    expect(result.topNetBuy.map((f) => f.symbol)).toEqual(["BUY1", "BUY2"]);
    expect(result.topNetSell.map((f) => f.symbol)).toEqual(["SELL1"]);
  });

  it("skips symbols with no foreign activity", () => {
    const result = computeMarketForeignFlow(items, "HOSE", "2026-07-30");
    const listed = result.topNetBuy.concat(result.topNetSell).map((f) => f.symbol);
    expect(listed).not.toContain("QUIET");
  });

  it("honours the top limit", () => {
    const many = [1, 2, 3, 4, 5].map((n) =>
      board({ symbol: `S${n}`, averagePrice: 10, foreignBuyVolume: n * 1_000_000 })
    );
    const result = computeMarketForeignFlow(many, "HOSE", "2026-07-30", 2);
    expect(result.topNetBuy.map((f) => f.symbol)).toEqual(["S5", "S4"]);
  });
});

describe("computeLiquidity", () => {
  it("converts trieu VND to ty VND", () => {
    const result = computeLiquidity(
      [bar({ date: "2026-07-29", value: 10_000_000 }), bar({ date: "2026-07-30", value: 20_000_000 })],
      "VNINDEX"
    );

    expect(result.value).toBe(20000);
    expect(result.valuePrevious).toBe(10000);
    expect(result.changePercent).toBe(100);
    expect(result.unit).toBe("tyVND");
  });

  it("reports null previous when there is only one bar", () => {
    const result = computeLiquidity([bar({ value: 1_000_000 })], "VNINDEX");
    expect(result.valuePrevious).toBeNull();
    expect(result.changePercent).toBeNull();
  });

  it("treats a missing value field as zero rather than NaN", () => {
    const result = computeLiquidity([bar({})], "VNINDEX");
    expect(result.value).toBe(0);
  });
});

describe("averageLiquidity", () => {
  it("averages the most recent bars that carry a value", () => {
    const bars = [
      bar({ value: 1_000_000 }),
      bar({ value: 2_000_000 }),
      bar({ value: 3_000_000 }),
    ];
    expect(averageLiquidity(bars, 3)).toBe(2000);
  });

  it("ignores bars with no value", () => {
    expect(averageLiquidity([bar({}), bar({ value: 4_000_000 })], 20)).toBe(4000);
  });
});

describe("toIndexSnapshot", () => {
  it("computes change against the previous bar", () => {
    const snap = toIndexSnapshot(
      [bar({ date: "2026-07-29", close: 1600 }), bar({ date: "2026-07-30", close: 1680 })],
      "VNINDEX"
    );

    expect(snap.close).toBe(1680);
    expect(snap.change).toBe(80);
    expect(snap.changePercent).toBe(5);
  });

  it("throws rather than inventing a snapshot from nothing", () => {
    expect(() => toIndexSnapshot([], "VNINDEX")).toThrow(/No index bars/);
  });
});

describe("classifyRegime", () => {
  function series(fn: (i: number) => number, n = 60): QuoteHistory[] {
    return Array.from({ length: n }, (_, i) => bar({ close: fn(i) }));
  }

  it("calls a rising series trending up", () => {
    expect(classifyRegime(series((i) => 100 + i * 2)).regime).toBe("trending_up");
  });

  it("calls a falling series trending down", () => {
    expect(classifyRegime(series((i) => 300 - i * 2)).regime).toBe("trending_down");
  });

  it("falls back to sideways without enough history", () => {
    const result = classifyRegime(series((i) => 100 + i, 10));
    expect(result.regime).toBe("sideways");
    expect(result.rationale).toMatch(/Not enough history/);
  });
});

describe("liquiditySignal", () => {
  it("flags heavy and light sessions against the 20-day norm", () => {
    expect(liquiditySignal(130, 100)).toBe("above_average");
    expect(liquiditySignal(70, 100)).toBe("below_average");
    expect(liquiditySignal(100, 100)).toBe("normal");
  });

  it("stays normal when there is no baseline to compare against", () => {
    expect(liquiditySignal(100, 0)).toBe("normal");
  });
});
