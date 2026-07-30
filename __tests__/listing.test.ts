import axios from "axios";
import vnstock from "../src";

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
