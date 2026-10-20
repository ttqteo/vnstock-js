import { handleSearch } from "../../src/cli/commands/search";

const results = [
  { symbol: "VNM", companyName: "Vinamilk", exchange: "HSX" },
  { symbol: "VCB", companyName: "Vietcombank", exchange: "HSX" },
];

const base = { json: false, csv: false, color: false, quiet: true, verbose: false };

function fakeClient(out: any[] = results) {
  const search = jest.fn(async (_q: string, _o: any) => out);
  return { client: { search } as any, search };
}

describe("handleSearch", () => {
  it("returns JSON when --json", async () => {
    const { client } = fakeClient();
    expect(JSON.parse(await handleSearch(client, { query: "v", ...base, json: true }))).toHaveLength(2);
  });

  it("returns a table with symbol, name and exchange by default", async () => {
    const { client } = fakeClient();
    const out = await handleSearch(client, { query: "v", ...base });
    expect(out).toContain("VNM");
    expect(out).toContain("Vinamilk");
    expect(out).toContain("HSX");
  });

  it("passes the limit to the client and defaults to 10", async () => {
    const { client, search } = fakeClient();
    await handleSearch(client, { query: "bank", limit: 3, ...base });
    expect(search).toHaveBeenLastCalledWith("bank", { limit: 3 });
    await handleSearch(client, { query: "bank", ...base });
    expect(search).toHaveBeenLastCalledWith("bank", { limit: 10 });
  });

  it("says when nothing matches", async () => {
    const { client } = fakeClient([]);
    expect(await handleSearch(client, { query: "zzz", ...base })).toBe("No matches for: zzz");
  });
});
