import axios from "axios";
import vnstock from "../src";

const RUN_INTEGRATION = process.env.INTEGRATION === "1";
const describeIntegration = RUN_INTEGRATION ? describe : describe.skip;

describeIntegration("Financial (integration — INTEGRATION=1)", () => {
  it("should return normalized balance sheet", async () => {
    const data = await vnstock.stock.financials.balanceSheet({
      symbol: "VCI",
      period: "quarter",
    });

    expect(data).toHaveProperty("data");
    expect(data).toHaveProperty("mapping");
    expect(data.data).toHaveProperty("symbol");
    expect(data.data).not.toHaveProperty("ticker");
  }, 30000);

  it("should return normalized income statement", async () => {
    const data = await vnstock.stock.financials.incomeStatement({
      symbol: "VCI",
      period: "year",
    });

    expect(data).toHaveProperty("data");
    expect(data.data).toHaveProperty("symbol");
  }, 30000);

  it("should return normalized cash flow", async () => {
    const data = await vnstock.stock.financials.cashFlow({
      symbol: "VCI",
    });

    expect(data).toHaveProperty("data");
    expect(data.data).toHaveProperty("symbol");
  }, 30000);
});

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
