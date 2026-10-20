import { symbolSeries, marketSeries } from "../../src/client/market";
import { ForeignDay } from "../../src/data/foreign";

const DAYS: ForeignDay[] = [
  {
    date: "2026-10-12",
    rows: [
      ["FPT", "HOSE", 100, 40, 12700000, 5080000],
      ["SHS", "HNX", 10, 0, 200000, 0],
    ],
  },
  { date: "2026-10-13", rows: [["SHS", "HNX", 0, 5, 0, 100000]] },
];

describe("symbolSeries", () => {
  it("gives one flow per recorded session, zeros when the symbol had none", () => {
    expect(symbolSeries(DAYS, "fpt")).toEqual([
      {
        symbol: "FPT",
        date: "2026-10-12",
        buyVolume: 100,
        sellVolume: 40,
        netVolume: 60,
        buyValue: 12700000,
        sellValue: 5080000,
        netValue: 7620000,
        unit: "VND",
      },
      { symbol: "FPT", date: "2026-10-13", buyVolume: 0, sellVolume: 0, netVolume: 0, buyValue: 0, sellValue: 0, netValue: 0, unit: "VND" },
    ]);
  });
});

describe("marketSeries", () => {
  it("sums the rows of one exchange per session", () => {
    expect(marketSeries(DAYS, "HOSE").map((d) => [d.date, d.buyValue, d.sellValue, d.netValue])).toEqual([
      ["2026-10-12", 12700000, 5080000, 7620000],
      ["2026-10-13", 0, 0, 0],
    ]);
  });

  it("sums all three exchanges for ALL", () => {
    const s = marketSeries(DAYS, "ALL");
    expect(s[0]).toEqual({
      exchange: "ALL",
      date: "2026-10-12",
      buyVolume: 110,
      sellVolume: 40,
      netVolume: 70,
      buyValue: 12900000,
      sellValue: 5080000,
      netValue: 7820000,
      unit: "VND",
    });
    expect(s[1]).toMatchObject({ sellVolume: 5, netVolume: -5, netValue: -100000 });
  });
});
