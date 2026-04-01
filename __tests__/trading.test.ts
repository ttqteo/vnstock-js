import vnstock from "../src";

describe("Trading", () => {
  it("should return normalized price board", async () => {
    const data = await vnstock.stock.trading.priceBoard(["VCI"]);

    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    const item = data[0];
    expect(item).toHaveProperty("symbol");
    expect(item).toHaveProperty("price");
    expect(item).toHaveProperty("totalVolume");
    expect(item).toHaveProperty("ceilingPrice");
    expect(item).toHaveProperty("floorPrice");
    expect(item).toHaveProperty("referencePrice");
    expect(item).toHaveProperty("bidPrices");
    expect(item).toHaveProperty("askPrices");

    expect(item.price).toBeLessThan(1000);
    expect(item.ceilingPrice).toBeLessThan(1000);

    expect(item).not.toHaveProperty("listingInfo");
    expect(item).not.toHaveProperty("bidAsk");
    expect(item).not.toHaveProperty("matchPrice");
  }, 30000);

  it("should return normalized top gainers", async () => {
    const data = await vnstock.stock.trading.topGainers();

    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    const item = data[0];
    expect(item).toHaveProperty("symbol");
    expect(item).toHaveProperty("exchange");
    expect(item).toHaveProperty("marketCap");
    expect(item).not.toHaveProperty("stockCode");
    expect(item).not.toHaveProperty("group");
  }, 30000);

  it("should return normalized top losers", async () => {
    const data = await vnstock.stock.trading.topLosers();

    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty("symbol");
  }, 30000);
});
