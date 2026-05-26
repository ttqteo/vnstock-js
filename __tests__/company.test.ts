import axios from "axios";
import vnstock from "../src";
import { Company } from "../src/core/stock/company";

const RUN_INTEGRATION = process.env.INTEGRATION === "1";
const describeIntegration = RUN_INTEGRATION ? describe : describe.skip;

describeIntegration("Company (integration — INTEGRATION=1)", () => {
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

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("Company (mocked)", () => {
  let company: Company;

  beforeEach(() => {
    jest.clearAllMocks();
    company = new Company("VCI");
  });

  // Adapter's fetchCompanyOverview assembles output from 5 endpoint calls
  // (details, shareholder-structure, shareholder, events, news). The mock below
  // sets a default empty-data response for all 5; assertions stay on transform
  // shape rather than full content matching.
  function mockOverviewEmpty() {
    mockedAxios.request.mockResolvedValue({ data: { data: [] }, headers: {} });
  }

  function mockOverviewDetails(detailsPayload: any) {
    // details endpoint returns `{ data: { organCode, sectorVn, ... } }`,
    // others return arrays — call mockImplementation to differentiate by URL.
    mockedAxios.request.mockImplementation((config: any) => {
      if (typeof config.url === "string" && config.url.indexOf("/details") !== -1) {
        return Promise.resolve({ data: detailsPayload, headers: {} });
      }
      return Promise.resolve({ data: { data: [] }, headers: {} });
    });
  }

  it("profile() normalizes details → industry/issuedShares", async () => {
    mockOverviewDetails({
      data: {
        organCode: "VCI",
        numberOfSharesMktCap: 408460396,
        sectorVn: "Tài chính",
        sector: "Finance",
        viOrganProfile: "<p>VCI là...</p>",
        enOrganProfile: "<p>VCI is...</p>",
      },
    });
    const data = await company.profile();
    expect(data).toHaveProperty("industry");
    expect(data).toHaveProperty("industryEn");
    expect(data).toHaveProperty("issuedShares");
    expect(data).not.toHaveProperty("issueShare");
    expect(data).not.toHaveProperty("icbName3");
  });

  it("shareholders() returns empty array for empty payload", async () => {
    mockOverviewEmpty();
    const data = await company.shareholders();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(0);
  });

  it("officers() returns empty array for empty payload", async () => {
    mockOverviewEmpty();
    const data = await company.officers();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(0);
  });

  it("events() returns empty array for empty payload", async () => {
    mockOverviewEmpty();
    const data = await company.events();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(0);
  });

  it("news() returns empty array for empty payload", async () => {
    mockOverviewEmpty();
    const data = await company.news();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(0);
  });

});
