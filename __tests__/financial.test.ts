import axios from "axios";
import vnstock from "../src";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("Financial (mocked)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: empty payloads for all 3 endpoints
    mockedAxios.request.mockResolvedValue({ data: { data: {} }, headers: {} });
  });

  it("balanceSheet() returns { data, mapping } shape", async () => {
    const data = await vnstock.stock.financials.balanceSheet({
      symbol: "VCI",
      period: "quarter",
    });
    expect(data).toHaveProperty("data");
    expect(data).toHaveProperty("mapping");
    expect(data.mapping).toHaveProperty("ratio");
    expect(data.mapping).toHaveProperty("unit");
  });

  it("incomeStatement() returns { data, mapping } shape", async () => {
    const data = await vnstock.stock.financials.incomeStatement({
      symbol: "VCI",
      period: "year",
    });
    expect(data).toHaveProperty("data");
    expect(data).toHaveProperty("mapping");
  });

  it("cashFlow() returns { data, mapping } shape", async () => {
    const data = await vnstock.stock.financials.cashFlow({ symbol: "VCI" });
    expect(data).toHaveProperty("data");
    expect(data).toHaveProperty("mapping");
  });
});
