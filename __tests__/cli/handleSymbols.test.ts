jest.mock("../../src/core/listing/directory", () => ({
  Directory: {
    getByExchange: jest.fn(),
    all: jest.fn(),
  },
}));

import { handleSymbols, meta } from "../../src/cli/commands/symbols";
import { Directory } from "../../src/core/listing/directory";

const mockByExchange = (Directory as any).getByExchange as jest.Mock;
const mockAll = (Directory as any).all as jest.Mock;

const base = { json: false, csv: false, color: false, quiet: true, verbose: false };

beforeEach(() => {
  mockByExchange.mockReset();
  mockAll.mockReset();
});

describe("handleSymbols meta", () => {
  it("requires data init", () => {
    expect(meta.requiresData).toBe(true);
  });
});

describe("handleSymbols", () => {
  const sampleSymbols = Array.from({ length: 15 }, (_, i) => ({
    symbol: "SYM" + i,
    companyName: "Company " + i,
    exchange: "HSX",
  }));

  it("uses getByExchange when --exchange provided", async () => {
    mockByExchange.mockReturnValue(sampleSymbols);
    await handleSymbols({ exchange: "HOSE", ...base, json: true });
    expect(mockByExchange).toHaveBeenCalledWith("HOSE");
  });

  it("uses all() when no --exchange", async () => {
    mockAll.mockReturnValue(sampleSymbols);
    await handleSymbols({ ...base, json: true });
    expect(mockAll).toHaveBeenCalled();
  });

  it("returns full list by default (no auto limit)", async () => {
    const big = Array.from({ length: 100 }, (_, i) => ({
      symbol: "S" + i,
      companyName: "n",
      exchange: "HSX",
    }));
    mockAll.mockReturnValue(big);
    const out = await handleSymbols({ ...base, json: true });
    const parsed = JSON.parse(out);
    expect(parsed).toHaveLength(100);
  });

  it("applies --limit when provided", async () => {
    const big = Array.from({ length: 100 }, (_, i) => ({
      symbol: "S" + i,
      companyName: "n",
      exchange: "HSX",
    }));
    mockAll.mockReturnValue(big);
    const out = await handleSymbols({ ...base, limit: 10, json: true });
    const parsed = JSON.parse(out);
    expect(parsed).toHaveLength(10);
  });

  it("default output is grid (symbol only)", async () => {
    mockAll.mockReturnValue(sampleSymbols);
    const out = await handleSymbols({ ...base });
    expect(out).toContain("SYM0");
    expect(out).not.toContain("Company 0");
  });

  it("verbose output is 2-col table (symbol + name)", async () => {
    mockAll.mockReturnValue(sampleSymbols);
    const out = await handleSymbols({ ...base, verbose: true });
    expect(out).toContain("SYM0");
    expect(out).toContain("Company 0");
  });
});
