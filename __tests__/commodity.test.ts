import vnstock from "../src";

const RUN_INTEGRATION = process.env.INTEGRATION === "1";
const describeIntegration = RUN_INTEGRATION ? describe : describe.skip;

// BTMC times out from non-VN IPs, so it cannot run on GitHub runners: each
// attempt burns the full 3x15s retry budget before failing. It works fine from
// a Vietnamese IP, so gate it separately rather than skipping it everywhere.
// Run with: npm run test:integration:vn
const RUN_VN = RUN_INTEGRATION && process.env.INTEGRATION_VN === "1";
const itVN = RUN_VN ? it : it.skip;

describeIntegration("Commodity (integration, INTEGRATION=1)", () => {
  itVN("should return normalized BTMC gold prices (needs VN IP)", async () => {
    const data = await vnstock.commodity.goldPriceBTMC();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty("name");
    expect(data[0]).toHaveProperty("buyPrice");
    expect(data[0]).toHaveProperty("sellPrice");
    expect(data[0]).toHaveProperty("karat");
    expect(data[0]).not.toHaveProperty("kara");
    expect(data[0]).not.toHaveProperty("buy");
    // 60s: BTMC hangs intermittently; fetchWithRetry worst case is 3x15s + backoff (~48s)
  }, 60000);

  it("should return normalized GiaVangNet gold prices", async () => {
    const data = await vnstock.commodity.goldPriceGiaVangNet();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty("code");
    expect(data[0]).toHaveProperty("buyPrice");
    expect(data[0]).not.toHaveProperty("type_code");
  }, 30000);

  // Deliberately not gated behind INTEGRATION_VN: this is the most valuable gold
  // test precisely where BTMC is unreachable, because it proves the fallback to
  // GiaVangNet works for real. From a non-VN IP it spends the full 3x15s retry
  // budget on BTMC first, then falls back, so it needs more headroom than the
  // 60s the direct tests use.
  it("goldPrice auto returns data with a source field", async () => {
    const result = await vnstock.commodity.goldPrice();
    expect(["btmc", "giavangnet"]).toContain(result.source);
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data.length).toBeGreaterThan(0);
  }, 90000);

  // Skipped: sjc.com.vn/GoldPrice/Services/PriceService.ashx returns 403 from
  // CI/external IPs. Upstream blocked, no auth bypass. See issue tracker.
  it.skip("should return normalized SJC gold prices", async () => {
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
