import vnstock from "../src";
import { Company } from "../src/core/stock/company";

// Skipped: VCI GraphQL endpoint (trading.vietcap.com.vn/data-mt/graphql)
// returns HTTP 200 with empty body {} since ~2026-04. Planned migration to
// KBS data source in v1.4. See: https://github.com/ttqteo/vnstock-js/issues
describe.skip("Company", () => {
  let company: Company;

  beforeAll(() => {
    company = new Company("VCI");
  });

  it("should return normalized profile", async () => {
    const data = await company.profile();
    expect(data).toHaveProperty("industry");
    expect(data).toHaveProperty("industryEn");
    expect(data).toHaveProperty("issuedShares");
    expect(data).not.toHaveProperty("issueShare");
    expect(data).not.toHaveProperty("icbName3");
  }, 30000);

  it("should return normalized shareholders", async () => {
    const data = await company.shareholders();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty("name");
    expect(data[0]).toHaveProperty("percentage");
    expect(data[0]).not.toHaveProperty("ownerFullName");
  }, 30000);

  it("should return normalized officers", async () => {
    const data = await company.officers();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty("name");
    expect(data[0]).toHaveProperty("position");
    expect(data[0]).not.toHaveProperty("fullName");
    expect(data[0]).not.toHaveProperty("positionName");
  }, 30000);

  it("should return normalized events", async () => {
    const data = await company.events();
    expect(Array.isArray(data)).toBe(true);
    if (data.length > 0) {
      expect(data[0]).toHaveProperty("title");
      expect(data[0]).toHaveProperty("eventType");
      expect(data[0]).not.toHaveProperty("eventTitle");
      expect(data[0]).not.toHaveProperty("eventListCode");
    }
  }, 30000);

  it("should return normalized news", async () => {
    const data = await company.news();
    expect(Array.isArray(data)).toBe(true);
    if (data.length > 0) {
      expect(data[0]).toHaveProperty("title");
      expect(data[0]).toHaveProperty("summary");
      expect(data[0]).not.toHaveProperty("newsTitle");
      expect(data[0]).not.toHaveProperty("newsShortContent");
    }
  }, 30000);

  it("should return normalized dividends", async () => {
    const data = await company.dividends();
    expect(Array.isArray(data)).toBe(true);
  }, 30000);

  it("should return normalized insider deals", async () => {
    const data = await company.insiderDeals();
    expect(Array.isArray(data)).toBe(true);
  }, 30000);

  it("should return subsidiaries", async () => {
    const data = await company.subsidiaries();
    expect(Array.isArray(data)).toBe(true);
  }, 30000);
});
