import vnstock from "../src";

describe("Commodity", () => {
  it("should return normalized BTMC gold prices", async () => {
    const data = await vnstock.commodity.goldPriceBTMC();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty("name");
    expect(data[0]).toHaveProperty("buyPrice");
    expect(data[0]).toHaveProperty("sellPrice");
    expect(data[0]).toHaveProperty("karat");
    expect(data[0]).not.toHaveProperty("kara");
    expect(data[0]).not.toHaveProperty("buy");
  }, 30000);

  it("should return GiaVangNet gold prices", async () => {
    const data = await vnstock.commodity.goldPriceGiaVangNet();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  }, 30000);

  it("should return normalized SJC gold prices", async () => {
    const data = await vnstock.commodity.goldPriceSJC();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty("type");
    expect(data[0]).toHaveProperty("buyPrice");
    expect(data[0]).toHaveProperty("sellPrice");
    expect(data[0]).not.toHaveProperty("TypeName");
    expect(data[0]).not.toHaveProperty("BuyValue");
  }, 30000);

  it("should return normalized exchange rates", async () => {
    const data = await vnstock.commodity.exchangeRates();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty("currencyCode");
    expect(data[0]).toHaveProperty("currencyName");
    expect(data[0]).toHaveProperty("buyCash");
    expect(data[0]).toHaveProperty("sell");
    expect(data[0]).not.toHaveProperty("CurrencyCode");
    expect(data[0]).not.toHaveProperty("Buy Cash");
  }, 30000);
});
