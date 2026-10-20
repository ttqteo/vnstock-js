import { VciAdapter } from "../../src/adapters/vci";
import { createCompany, financials } from "../../src/client/company";
import { Transport } from "../../src/transport";

// Restates the scenarios of the v1 listing, company and financial tests against the adapter
// the v2 client uses, through an injected transport.

function fakeTransport(answer: (c: any) => unknown) {
  const calls: any[] = [];
  const transport: Transport = {
    async request<T>(c: any): Promise<T> {
      calls.push(c);
      return answer(c) as T;
    },
  };
  return { calls, transport };
}

describe("VciAdapter listing", () => {
  it("normalizes board to exchange and organName to companyName", async () => {
    const { transport } = fakeTransport(() => [{ symbol: "VCB", board: "HSX", organName: "Vietcombank", icbName3: "Ngân hàng", enIcbName3: "Banks" }]);
    const [row] = await new VciAdapter({ transport }).fetchSymbolsByExchange();
    expect(row).toHaveProperty("symbol", "VCB");
    expect(row).toHaveProperty("exchange");
    expect(row).toHaveProperty("companyName", "Vietcombank");
    expect(row).not.toHaveProperty("board");
    expect(row).not.toHaveProperty("organName");
  });

  it("normalizes ICB codes and sector names", async () => {
    const { transport } = fakeTransport(() => ({
      data: [
        { name: "0001", icbLevel: 1, viSector: "Năng lượng", enSector: "Oil & Gas" },
        { name: "0500", icbLevel: 2, viSector: "Dầu khí", enSector: "Oil & Gas Producers" },
      ],
    }));
    const rows = await new VciAdapter({ transport, cache: false }).fetchIndustriesIcb();
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ code: "0001", name: "Năng lượng", nameEn: "Oil & Gas" });
  });

  it("reads a group list such as VN30", async () => {
    const { transport, calls } = fakeTransport(() => [
      { symbol: "VCB", board: "HSX", organName: "Vietcombank" },
      { symbol: "FPT", board: "HSX", organName: "FPT Corp" },
    ]);
    const rows = await new VciAdapter({ transport }).fetchSymbolsByGroup("VN30");
    expect(rows.map((r) => r.symbol)).toEqual(["VCB", "FPT"]);
    expect(JSON.stringify(calls[0])).toContain("VN30");
  });
});

describe("VciAdapter company overview through createCompany", () => {
  function overviewTransport(details: unknown) {
    return fakeTransport((c) => (String(c.url).includes("/details") ? details : { data: [] }));
  }

  it("normalizes the details endpoint into the profile", async () => {
    const { transport } = overviewTransport({
      data: {
        organCode: "VCI",
        numberOfSharesMktCap: 408460396,
        sectorVn: "Tài chính",
        sector: "Finance",
        viOrganProfile: "<p>VCI là...</p>",
        enOrganProfile: "<p>VCI is...</p>",
      },
    });
    const profile = await createCompany(new VciAdapter({ transport }), "VCI").profile();
    expect(profile).toHaveProperty("industry");
    expect(profile).toHaveProperty("industryEn");
    expect(profile).toHaveProperty("issuedShares");
    expect(profile).not.toHaveProperty("issueShare");
    expect(profile).not.toHaveProperty("icbName3");
    expect(profile.symbol).toBe("VCI");
  });

  it("returns empty sections for empty payloads", async () => {
    const { transport } = fakeTransport(() => ({ data: [] }));
    const c = createCompany(new VciAdapter({ transport }), "VCI");
    expect(await c.shareholders()).toEqual([]);
    expect(await c.officers()).toEqual([]);
    expect(await c.events()).toEqual([]);
    expect(await c.news()).toEqual([]);
  });
});

describe("VciAdapter financial reports through financials()", () => {
  it.each(["balance", "income", "cashflow"] as const)("%s returns a statement even for empty payloads", async (kind) => {
    const { transport } = fakeTransport(() => ({ data: {} }));
    const st = await financials(new VciAdapter({ transport }), "VCI", kind);
    expect(st).toMatchObject({ symbol: "VCI", kind, period: "quarter", unit: "VND", rows: [] });
  });

  it("asks for the statement section and period of the kind", async () => {
    const { transport, calls } = fakeTransport(() => ({ data: { years: [{ yearReport: 2025, lengthReport: 5, isa1: 7.02e13 }] } }));
    const st = await financials(new VciAdapter({ transport }), "FPT", "income", { period: "year" });
    const statement = calls.find((c) => String(c.url).endsWith("/financial-statement"));
    expect(statement.params).toMatchObject({ section: "INCOME_STATEMENT" });
    expect(st.rows[0]).toMatchObject({ period: "2025", values: { isa1: 7.02e13 } });
  });
});
