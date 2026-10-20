import { InvalidParameterError } from "../errors";
import { FinancialParams, FinancialResult } from "../adapters/types";
import { applyTransform } from "../pipeline/transform";
import { TransformConfig } from "../pipeline/types";
import {
  companyProfileTransformConfig,
  shareholderTransformConfig,
  officerTransformConfig,
  eventTransformConfig,
  newsTransformConfig,
} from "../pipeline/transform/configs/company";
import { CompanyProfile, Shareholder, Officer, CorporateEvent, StockNews } from "../models/normalized";

export type { CompanyProfile, Shareholder, Officer, CorporateEvent, StockNews } from "../models/normalized";

export interface CompanySource {
  fetchCompanyOverview(symbol: string, lang: string): Promise<any>;
  fetchFinancialReport(params: FinancialParams & { reportKey: string }): Promise<FinancialResult>;
}

export interface Company {
  profile(): Promise<CompanyProfile & { symbol: string }>;
  shareholders(): Promise<Shareholder[]>;
  officers(): Promise<Officer[]>;
  events(): Promise<CorporateEvent[]>;
  dividends(): Promise<CorporateEvent[]>;
  news(): Promise<StockNews[]>;
}

function transform<T>(raw: any, config: TransformConfig): T {
  return applyTransform(raw || {}, config) as unknown as T;
}

/**
 * Company sections of one symbol, sharing a single overview request. Rows carry `symbol`, prices
 * stay in dong and dates are ICT YYYY-MM-DD.
 * @example
 * const fpt = createCompany(source, "FPT");
 * const holders = await fpt.shareholders();
 */
export function createCompany(source: CompanySource, symbol: string): Company {
  const sym = symbol.toUpperCase();
  let overview: Promise<any> | null = null;
  const load = (): Promise<any> => {
    if (!overview) {
      overview = source.fetchCompanyOverview(sym, "vi").then((d) => d || {});
      // A failure is not kept: the next call asks again.
      overview.catch(() => {
        overview = null;
      });
    }
    return overview;
  };
  const list = async <T>(key: string, config: TransformConfig): Promise<T[]> => ((await load())[key] || []).map((r: any) => transform<T>(r, config));
  const events = () => list<CorporateEvent>("OrganizationEvents", eventTransformConfig);

  return {
    async profile() {
      return { ...transform<CompanyProfile>((await load()).CompanyListingInfo, companyProfileTransformConfig), symbol: sym };
    },
    shareholders: () => list<Shareholder>("OrganizationShareHolders", shareholderTransformConfig),
    officers: () => list<Officer>("OrganizationManagers", officerTransformConfig),
    events,
    async dividends() {
      return (await events()).filter((e) => (e.eventType || "").includes("DIVIDEND"));
    },
    news: () => list<StockNews>("News", newsTransformConfig),
  };
}

export type StatementKind = "balance" | "income" | "cashflow" | "ratios";

export interface StatementField {
  field: string;
  titleVi: string;
  titleEn: string;
  level: number;
  parent: string | null;
}

export interface FinancialStatement {
  symbol: string;
  kind: StatementKind;
  period: "year" | "quarter";
  /** Statement amounts are in dong, as the source reports them. Ratios are plain numbers. */
  unit: "VND";
  /** Line items in report order; empty for ratios. */
  fields: StatementField[];
  /** Oldest first. `period` is "2025" or "2025-Q2". */
  rows: { period: string; values: Record<string, number | null> }[];
}

const REPORT_KEYS: Record<Exclude<StatementKind, "ratios">, string> = {
  balance: "Chỉ tiêu cân đối kế toán",
  income: "Chỉ tiêu kết quả kinh doanh",
  cashflow: "Chỉ tiêu lưu chuyển tiền tệ",
};
const KINDS: StatementKind[] = ["balance", "income", "cashflow", "ratios"];
const META = ["yearReport", "lengthReport", "ticker", "organCode", "createDate", "updateDate", "publicDate"];

function periodLabel(row: any, period: "year" | "quarter"): string {
  const year = String(row.yearReport ?? "");
  return period === "year" ? year : year + "-Q" + row.lengthReport;
}

function numericValues(row: any, only: string[] | null): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  const keys = only && only.length > 0 ? only : Object.keys(row).filter((k) => !META.includes(k));
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "number" && isFinite(v)) out[k] = v;
    else if (only && only.length > 0) out[k] = null;
  }
  return out;
}

/**
 * One financial statement or the ratio history of a symbol. Amounts come back in dong as the
 * source reports them (FPT's annual revenue is around 7e13).
 * @example
 * const income = await financials(source, "FPT", "income", { period: "year" });
 * income.rows.at(-1)?.values.isa1 // revenue in dong
 */
export async function financials(
  source: CompanySource,
  symbol: string,
  kind: StatementKind,
  options: { period?: "year" | "quarter" } = {}
): Promise<FinancialStatement> {
  if (!KINDS.includes(kind)) throw new InvalidParameterError("kind", kind, KINDS);
  const period = options.period ?? "quarter";
  if (period !== "year" && period !== "quarter") throw new InvalidParameterError("period", period, ["year", "quarter"]);
  const sym = symbol.toUpperCase();
  const reportKey = kind === "ratios" ? REPORT_KEYS.income : REPORT_KEYS[kind];
  const res = await source.fetchFinancialReport({ symbol: sym, period, lang: "vi", reportKey } as FinancialParams & { reportKey: string });
  const data: any = (res && res.data) || {};

  if (kind === "ratios") {
    // The ratio history mixes annual (lengthReport 5) and quarterly rows.
    const wanted = (data.ratio || []).filter((r: any) => (period === "year" ? r.lengthReport === 5 : r.lengthReport !== 5));
    return {
      symbol: sym,
      kind,
      period,
      unit: "VND",
      fields: [],
      rows: wanted.map((r: any) => ({ period: periodLabel(r, period), values: numericValues(r, null) })),
    };
  }

  const fields: StatementField[] = ((res && res.mapping && (res.mapping.ratio as any)?.fields) || []).map((f: any) => ({
    field: f.field,
    titleVi: f.titleVi || "",
    titleEn: f.titleEn || "",
    level: f.level ?? 0,
    parent: f.parent ?? null,
  }));
  const names = fields.map((f) => f.field);
  const rows = (period === "year" ? data.years : data.quarters) || [];
  return { symbol: sym, kind, period, unit: "VND", fields, rows: rows.map((r: any) => ({ period: periodLabel(r, period), values: numericValues(r, names) })) };
}
