import axios from "axios";
import { Company } from "../src/core/stock/company";

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
