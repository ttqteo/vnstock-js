jest.mock("../../src/core/listing/directory", () => ({
  Directory: {
    search: jest.fn(),
  },
}));

import { handleSearch, meta } from "../../src/cli/commands/search";
import { Directory } from "../../src/core/listing/directory";

const mockSearch = (Directory as any).search as jest.Mock;

const sampleResults = [
  { symbol: "VNM", companyName: "Vinamilk", exchange: "HSX" },
  { symbol: "VND", companyName: "VNDirect", exchange: "HSX" },
  { symbol: "VHM", companyName: "Vinhomes", exchange: "HSX" },
];

const base = { json: false, csv: false, color: false, quiet: true, verbose: false };

beforeEach(() => {
  mockSearch.mockReset();
  mockSearch.mockReturnValue(sampleResults);
});

describe("handleSearch meta", () => {
  it("requires data init", () => {
    expect(meta.requiresData).toBe(true);
  });
});

describe("handleSearch", () => {
  it("returns JSON when --json", async () => {
    const out = await handleSearch({ query: "vina", ...base, json: true });
    const parsed = JSON.parse(out);
    expect(parsed).toHaveLength(3);
  });

  it("returns table with symbol, name, exchange by default", async () => {
    const out = await handleSearch({ query: "vina", ...base });
    expect(out).toContain("VNM");
    expect(out).toContain("Vinamilk");
  });

  it("passes limit to SDK", async () => {
    await handleSearch({ query: "v", limit: 5, ...base, json: true });
    expect(mockSearch).toHaveBeenCalledWith("v", { limit: 5 });
  });

  it("defaults to limit 10 when not provided", async () => {
    await handleSearch({ query: "v", ...base, json: true });
    expect(mockSearch).toHaveBeenCalledWith("v", { limit: 10 });
  });

  it("returns no-match message when empty", async () => {
    mockSearch.mockReturnValue([]);
    const out = await handleSearch({ query: "zzz", ...base });
    expect(out).toMatch(/no matches/i);
  });
});
