import { handleSymbols } from "../../src/cli/commands/symbols";

const sampleSymbols = Array.from({ length: 3 }, (_, i) => ({ symbol: "SYM" + i, companyName: "Company " + i, exchange: "HSX" }));

const base = { json: false, csv: false, color: false, quiet: true, verbose: false };

function fakeClient(list: any[] = sampleSymbols) {
  const symbols = jest.fn(async (_o: any) => list);
  return { client: { symbols } as any, symbols };
}

describe("handleSymbols", () => {
  it("filters by exchange when --exchange is given", async () => {
    const { client, symbols } = fakeClient();
    await handleSymbols(client, { exchange: "HOSE", ...base, json: true });
    expect(symbols).toHaveBeenCalledWith({ exchange: "HOSE" });
  });

  it("lists every symbol without --exchange", async () => {
    const { client, symbols } = fakeClient();
    await handleSymbols(client, { ...base, json: true });
    expect(symbols).toHaveBeenCalledWith({});
  });

  it("returns the full list by default and applies --limit", async () => {
    const big = Array.from({ length: 100 }, (_, i) => ({ symbol: "S" + i, companyName: "n", exchange: "HSX" }));
    expect(JSON.parse(await handleSymbols(fakeClient(big).client, { ...base, json: true }))).toHaveLength(100);
    expect(JSON.parse(await handleSymbols(fakeClient(big).client, { ...base, limit: 10, json: true }))).toHaveLength(10);
  });

  it("prints a grid of symbols by default and a two-column table with --verbose", async () => {
    const grid = await handleSymbols(fakeClient().client, { ...base });
    expect(grid).toContain("SYM0");
    expect(grid).not.toContain("Company 0");
    const table = await handleSymbols(fakeClient().client, { ...base, verbose: true });
    expect(table).toContain("Company 0");
  });
});
