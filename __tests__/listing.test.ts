import axios from "axios";
import vnstock from "../src";

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

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("Listing (mocked)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.request.mockResolvedValue({ data: {}, headers: {} });
  });

  it("symbolsByExchange normalizes board → exchange + organName → companyName", async () => {
    mockedAxios.request.mockResolvedValue({
      data: [
        { symbol: "VCB", board: "HSX", organName: "Vietcombank", icbName3: "Ngân hàng", enIcbName3: "Banks" },
      ],
      headers: {},
    });
    const data = await vnstock.stock.listing.symbolsByExchange();
    expect(Array.isArray(data)).toBe(true);
    expect(data[0]).toHaveProperty("symbol", "VCB");
    expect(data[0]).toHaveProperty("exchange");
    expect(data[0]).toHaveProperty("companyName");
    expect(data[0]).not.toHaveProperty("board");
    expect(data[0]).not.toHaveProperty("organName");
  });

  it("industriesIcb normalizes ICB code → code + viSector → name", async () => {
    mockedAxios.request.mockResolvedValue({
      data: {
        data: [
          { name: "0001", icbLevel: 1, viSector: "Năng lượng", enSector: "Oil & Gas" },
          { name: "0500", icbLevel: 2, viSector: "Dầu khí", enSector: "Oil & Gas Producers" },
        ],
      },
      headers: {},
    });
    const data = await vnstock.stock.listing.industriesIcb();
    expect(data.length).toBe(2);
    expect(data[0]).toHaveProperty("code", "0001");
    expect(data[0]).toHaveProperty("name", "Năng lượng");
    expect(data[0]).toHaveProperty("nameEn", "Oil & Gas");
  });

  it("symbolsByGroup normalizes raw VN30 list", async () => {
    mockedAxios.request.mockResolvedValue({
      data: [
        { symbol: "VCB", board: "HSX", organName: "Vietcombank" },
        { symbol: "FPT", board: "HSX", organName: "FPT Corp" },
      ],
      headers: {},
    });
    const data = await vnstock.stock.listing.symbolsByGroup("VN30");
    expect(data.length).toBe(2);
    expect(data[0].symbol).toBe("VCB");
  });
});
