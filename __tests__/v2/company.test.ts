import { createCompany, financials, CompanySource } from "../../src/client/company";
import { InvalidParameterError } from "../../src/errors";

const T = (iso: string) => Date.parse(iso) / 1000;

const OVERVIEW = {
  CompanyListingInfo: { id: "1", issueShare: 1471000000, companyProfile: "FPT là...", icbName3: "Công nghệ", enIcbName3: "Technology" },
  OrganizationShareHolders: [
    { id: "s1", ticker: "FPT", ownerFullName: "Trương Gia Bình", quantity: 100000000, percentage: 0.068, updateDate: T("2026-06-30T20:00:00Z") },
  ],
  OrganizationManagers: [{ id: "o1", ticker: "FPT", fullName: "Nguyễn Văn Khoa", positionName: "Tổng giám đốc", quantity: 1000000, percentage: 0.0007 }],
  OrganizationEvents: [
    { id: "e1", ticker: "FPT", eventTitle: "Trả cổ tức 1.000 đồng", eventListCode: "DIVIDEND_CASH", recordDate: T("2026-08-14T17:30:00Z") },
    { id: "e2", ticker: "FPT", eventTitle: "Giao dịch nội bộ", eventListCode: "INSIDER_DEAL" },
  ],
  News: [{ id: "n1", ticker: "FPT", newsTitle: "FPT lãi lớn", closePrice: 125800, referencePrice: 124600, percentPriceChange: 0.96 }],
};

function companySource(overview: any = OVERVIEW) {
  const calls: string[] = [];
  const source: CompanySource = {
    async fetchCompanyOverview(symbol: string) {
      calls.push(symbol);
      return overview;
    },
    async fetchFinancialReport() {
      throw new Error("not used");
    },
  };
  return { source, calls };
}

describe("createCompany", () => {
  it("shares one overview request across every section and keys rows by symbol", async () => {
    const { source, calls } = companySource();
    const c = createCompany(source, "fpt");
    const [profile, holders, officers] = await Promise.all([c.profile(), c.shareholders(), c.officers()]);
    expect(calls).toEqual(["FPT"]);
    expect(profile).toMatchObject({ symbol: "FPT", issuedShares: 1471000000, industryEn: "Technology" });
    // VCI already sends ownership as a fraction: 0.068 is 6.8%.
    expect(holders[0]).toMatchObject({ symbol: "FPT", name: "Trương Gia Bình", quantity: 100000000, percentage: 0.068 });
    expect(holders[0]).not.toHaveProperty("ticker");
    expect(officers[0]).toMatchObject({ symbol: "FPT", position: "Tổng giám đốc", quantity: 1000000, ownership: 0.0007 });
  });

  it("stamps dates in ICT whatever the machine's time zone", async () => {
    const { source } = companySource();
    const c = createCompany(source, "FPT");
    expect((await c.shareholders())[0].updatedAt).toBe("2026-07-01");
    expect((await c.dividends())[0].recordDate).toBe("2026-08-15");
  });

  it("filters dividends out of the events", async () => {
    const c = createCompany(companySource().source, "FPT");
    expect((await c.events()).map((e) => e.id)).toEqual(["e1", "e2"]);
    expect((await c.dividends()).map((e) => e.id)).toEqual(["e1"]);
  });

  it("keeps news prices in dong", async () => {
    const [n] = await createCompany(companySource().source, "FPT").news();
    expect(n).toMatchObject({ symbol: "FPT", title: "FPT lãi lớn", closePrice: 125800, referencePrice: 124600 });
  });

  it("tolerates a sparse overview", async () => {
    const c = createCompany(companySource({}).source, "FPT");
    expect(await c.shareholders()).toEqual([]);
    expect(await c.profile()).toMatchObject({ symbol: "FPT" });
  });
});

describe("financials", () => {
  // Shape and magnitude captured from VCI for FPT, 2025 annual income statement (raw dong).
  const report = {
    data: {
      symbol: "FPT",
      years: [
        { yearReport: 2024, lengthReport: 5, isa1: 62848786000000, isa3: 62790000000000, isa22: 7855000000000 },
        { yearReport: 2025, lengthReport: 5, isa1: 70207688944553, isa3: 70112825100710, isa22: 9376127629501 },
      ],
      quarters: [{ yearReport: 2025, lengthReport: 4, isa1: 19000000000000, isa3: 18950000000000, isa22: 2600000000000 }],
      ratio: [{ yearReport: 2025, lengthReport: 5, pe: 18.2, roe: 0.28, marketCap: 185000000000000, ticker: "FPT" }],
    },
    mapping: {
      ratio: {
        fields: [
          { field: "isa1", titleVi: "Doanh thu bán hàng và cung cấp dịch vụ", titleEn: "Sales", level: 1, parent: null },
          { field: "isa3", titleVi: "Doanh thu thuần", titleEn: "Net sales", level: 1, parent: null },
          { field: "isa22", titleVi: "Lợi nhuận sau thuế", titleEn: "Net profit", level: 1, parent: null },
        ],
      },
      unit: {},
    },
  };

  function finSource() {
    const calls: any[] = [];
    const source: CompanySource = {
      async fetchCompanyOverview() {
        return {};
      },
      async fetchFinancialReport(p: any) {
        calls.push(p);
        return report as any;
      },
    };
    return { source, calls };
  }

  it("returns annual revenue in dong, around 6e13 for FPT", async () => {
    const { source, calls } = finSource();
    const st = await financials(source, "fpt", "income", { period: "year" });
    expect(calls[0]).toMatchObject({ symbol: "FPT", period: "year", reportKey: "Chỉ tiêu kết quả kinh doanh" });
    expect(st).toMatchObject({ symbol: "FPT", kind: "income", period: "year", unit: "VND" });
    const revenue = st.rows[st.rows.length - 1].values.isa1 as number;
    expect(revenue).toBeGreaterThan(3e13);
    expect(revenue).toBeLessThan(2e14);
    expect(st.rows.map((r) => r.period)).toEqual(["2024", "2025"]);
    expect(st.fields.map((f) => f.field)).toEqual(["isa1", "isa3", "isa22"]);
  });

  it("labels quarters and defaults to quarterly reports", async () => {
    const { source, calls } = finSource();
    const st = await financials(source, "FPT", "income");
    expect(calls[0].period).toBe("quarter");
    expect(st.rows.map((r) => r.period)).toEqual(["2025-Q4"]);
  });

  it("maps each kind to its report and serves ratios from the ratio rows", async () => {
    const { source, calls } = finSource();
    await financials(source, "FPT", "balance");
    await financials(source, "FPT", "cashflow");
    expect(calls.map((c) => c.reportKey)).toEqual(["Chỉ tiêu cân đối kế toán", "Chỉ tiêu lưu chuyển tiền tệ"]);
    const r = await financials(source, "FPT", "ratios", { period: "year" });
    expect(r.rows).toEqual([{ period: "2025", values: { pe: 18.2, roe: 0.28, marketCap: 185000000000000 } }]);
  });

  it("rejects unknown kinds and periods", async () => {
    const { source } = finSource();
    await expect(financials(source, "FPT", "profit" as any)).rejects.toBeInstanceOf(InvalidParameterError);
    await expect(financials(source, "FPT", "income", { period: "month" as any })).rejects.toBeInstanceOf(InvalidParameterError);
  });
});
