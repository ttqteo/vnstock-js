import { buildForeignSnapshot } from "../scripts/foreign-snapshot";
import { PriceBoardItem } from "../src/models/normalized";

function item(p: Partial<PriceBoardItem>): PriceBoardItem {
  return {
    symbol: "",
    companyName: "",
    companyNameEn: "",
    exchange: "HOSE",
    ceilingPrice: 0,
    floorPrice: 0,
    referencePrice: 0,
    price: 0,
    priceChange: 0,
    changePercent: 0,
    matchVolume: 0,
    totalVolume: 0,
    totalValue: 0,
    averagePrice: 0,
    highestPrice: 0,
    lowestPrice: 0,
    foreignBuyVolume: 0,
    foreignSellVolume: 0,
    bidPrices: [],
    askPrices: [],
    ...p,
  } as PriceBoardItem;
}

describe("buildForeignSnapshot", () => {
  it("values flows in dong and drops symbols without foreign activity", () => {
    const snap = buildForeignSnapshot("2026-10-14", [
      item({ symbol: "FPT", exchange: "HOSE", averagePrice: 125.8, foreignBuyVolume: 1000, foreignSellVolume: 400 }),
      item({ symbol: "SHS", exchange: "HNX", averagePrice: 18.2, foreignBuyVolume: 0, foreignSellVolume: 500 }),
      item({ symbol: "XYZ", exchange: "UPCOM", averagePrice: 10, foreignBuyVolume: 0, foreignSellVolume: 0 }),
    ]);
    expect(snap.date).toBe("2026-10-14");
    expect(snap.unit).toBe("VND");
    expect(snap.columns).toEqual(["symbol", "exchange", "buyVolume", "sellVolume", "buyValue", "sellValue"]);
    expect(snap.rows).toEqual([
      ["FPT", "HOSE", 1000, 400, 125800000, 50320000],
      ["SHS", "HNX", 0, 500, 0, 9100000],
    ]);
    expect(snap.totals.HOSE).toEqual({ buyValue: 125800000, sellValue: 50320000, netValue: 75480000 });
    expect(snap.totals.HNX).toEqual({ buyValue: 0, sellValue: 9100000, netValue: -9100000 });
    expect(snap.totals.UPCOM).toEqual({ buyValue: 0, sellValue: 0, netValue: 0 });
  });

  it("counts the VCI board code HSX as HOSE", () => {
    const snap = buildForeignSnapshot("2026-10-14", [item({ symbol: "VCB", exchange: "HSX", averagePrice: 60, foreignBuyVolume: 10 })]);
    expect(snap.rows[0][1]).toBe("HOSE");
    expect(snap.totals.HOSE.buyValue).toBe(600000);
  });

  it("falls back to match price when the average is missing", () => {
    const snap = buildForeignSnapshot("2026-10-14", [item({ symbol: "VCB", averagePrice: 0, price: 60, foreignBuyVolume: 10 })]);
    expect(snap.rows[0][4]).toBe(600000);
  });

  it("rounds prices to whole dong", () => {
    const snap = buildForeignSnapshot("2026-10-14", [item({ symbol: "ABC", averagePrice: 12.3456, foreignSellVolume: 100 })]);
    expect(snap.rows[0][5]).toBe(1234600);
  });
});
