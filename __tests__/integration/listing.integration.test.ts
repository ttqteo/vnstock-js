import vnstock from "../../src";

// Live VCI calls. Kept in a separate file because `jest.mock("axios")` is hoisted
// to the top of whatever file it appears in, which would silently mock these too.
const RUN_INTEGRATION = process.env.INTEGRATION === "1";
const describeIntegration = RUN_INTEGRATION ? describe : describe.skip;

describeIntegration("Listing (integration — INTEGRATION=1)", () => {
  // Skipped: ai.vietcap.com.vn endpoint currently returns 403
  it.skip("should return all symbols", async () => {
    const data = await vnstock.stock.listing.allSymbols();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty("symbol");
    expect(data[0]).toHaveProperty("companyName");
  }, 30000);

  it("should return symbols by exchange", async () => {
    const data = await vnstock.stock.listing.symbolsByExchange();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty("symbol");
    expect(data[0]).toHaveProperty("exchange");
    expect(data[0]).toHaveProperty("companyName");
    expect(data[0]).not.toHaveProperty("board");
    expect(data[0]).not.toHaveProperty("organName");
  }, 30000);

  it("should return symbols by industries", async () => {
    const data = await vnstock.stock.listing.symbolsByIndustries();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty("symbol");
    expect(data[0]).toHaveProperty("industry");
    expect(data[0]).toHaveProperty("industryEn");
    expect(data[0]).not.toHaveProperty("ticker");
    expect(data[0]).not.toHaveProperty("icbName3");
  }, 30000);

  it("should return ICB industries", async () => {
    const data = await vnstock.stock.listing.industriesIcb();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty("code");
    expect(data[0]).toHaveProperty("name");
    expect(data[0]).toHaveProperty("nameEn");
    expect(data[0]).not.toHaveProperty("icbCode");
    expect(data[0]).not.toHaveProperty("icbName");
  }, 30000);

  it("should return symbols by group VN30", async () => {
    const data = await vnstock.stock.listing.symbolsByGroup("VN30");
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty("symbol");
  }, 30000);
});
