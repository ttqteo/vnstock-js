import { toBars, toQuote, normalizeExchange } from "../../src/adapters/vci-transform";

const T = (iso: string) => Date.parse(iso) / 1000;

describe("toBars", () => {
  it("keeps stock prices in dong and scales turnover from million", () => {
    const bars = toBars(
      { symbol: "FPT", t: [T("2026-10-13T00:00:00Z")], o: [125000], h: [126500], l: [124800], c: [125800], v: [3120000], accumulatedValue: [392496] },
      "ONE_DAY"
    );
    expect(bars).toEqual([{ time: "2026-10-13", open: 125000, high: 126500, low: 124800, close: 125800, volume: 3120000, value: 392496000000 }]);
  });

  it("keeps index levels in points", () => {
    const bars = toBars(
      { symbol: "VNINDEX", t: [T("2026-10-13T00:00:00Z")], o: [1740.1], h: [1750], l: [1738], c: [1748.86], v: [1], accumulatedValue: [19197237] },
      "ONE_DAY"
    );
    expect(bars[0].close).toBe(1748.86);
    expect(bars[0].value).toBe(19197237000000);
  });

  it("stamps intraday bars with ICT time", () => {
    const bars = toBars({ symbol: "FPT", t: [T("2026-10-14T02:15:00Z")], o: [1], h: [1], l: [1], c: [1], v: [1] }, "ONE_MINUTE");
    expect(bars[0].time).toBe("2026-10-14T09:15:00+07:00");
    expect(bars[0].value).toBeNull();
    expect(toBars({ t: [T("2026-10-14T06:00:00Z")], o: [1], h: [1], l: [1], c: [1], v: [1] }, "ONE_HOUR")[0].time).toBe("2026-10-14T13:00:00+07:00");
  });

  it("returns no bars for an empty or missing series", () => {
    expect(toBars({ symbol: "FPT" }, "ONE_DAY")).toEqual([]);
    expect(toBars({ symbol: "FPT", t: [], o: [], h: [], l: [], c: [], v: [] }, "ONE_DAY")).toEqual([]);
  });
});

describe("toQuote", () => {
  it("maps a price-board row in dong", () => {
    const q = toQuote({
      listingInfo: { symbol: "FPT", organName: "FPT Corp", enOrganName: "FPT", board: "HSX", ceiling: 134600, floor: 117000, refPrice: 125800 },
      matchPrice: {
        matchPrice: 127000,
        accumulatedVolume: 3120000,
        accumulatedValue: 392496,
        matchVol: 2000,
        avgMatchPrice: 126300,
        highest: 127500,
        lowest: 125000,
        foreignBuyVolume: 1000,
        foreignSellVolume: 400,
      },
      bidAsk: { bidPrices: [{ price: 126900, volume: 500 }], askPrices: [{ price: 127000, volume: 800 }] },
    });
    expect(q).toEqual({
      symbol: "FPT",
      name: "FPT Corp",
      nameEn: "FPT",
      exchange: "HOSE",
      price: 127000,
      change: 1200,
      changePct: 0.954,
      ref: 125800,
      ceiling: 134600,
      floor: 117000,
      high: 127500,
      low: 125000,
      avg: 126300,
      volume: 3120000,
      value: 392496000000,
      matchVolume: 2000,
      foreignBuyVolume: 1000,
      foreignSellVolume: 400,
      bids: [{ price: 126900, volume: 500 }],
      asks: [{ price: 127000, volume: 800 }],
    });
  });

  it("reports no change before the first match", () => {
    const q = toQuote({ listingInfo: { symbol: "X", refPrice: 10000 }, matchPrice: { matchPrice: 0 } });
    expect(q.change).toBe(0);
    expect(q.changePct).toBe(0);
  });

  it("survives an empty row", () => {
    const q = toQuote({});
    expect(q.symbol).toBe("");
    expect(q.bids).toEqual([]);
    expect(q.value).toBe(0);
  });
});

describe("normalizeExchange", () => {
  it("reads HSX as HOSE and leaves the rest", () => {
    expect(normalizeExchange("HSX")).toBe("HOSE");
    expect(normalizeExchange("hnx")).toBe("HNX");
    expect(normalizeExchange("")).toBe("");
  });
});
