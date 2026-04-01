import { fetchWithRetry } from "../../pipeline/fetch";
import { GRAPHQL_URL } from "../../shared/constants";
import { ScreenFilter, ScreenOptions, ScreenResult } from "../../models/screening";

export { ScreenFilter };

export function applyFilters<T extends Record<string, unknown>>(
  data: T[],
  filters: ScreenFilter[],
  options: { sortBy?: string; order?: "asc" | "desc"; limit?: number } = {}
): T[] {
  let result = data.filter((item) =>
    filters.every((f) => {
      const val = item[f.field];
      if (val === null || val === undefined) return false;
      switch (f.operator) {
        case "<": return val < f.value;
        case ">": return val > f.value;
        case "<=": return val <= f.value;
        case ">=": return val >= f.value;
        case "=": return val === f.value;
        default: return true;
      }
    })
  );

  if (options.sortBy) {
    const dir = options.order === "asc" ? 1 : -1;
    result.sort((a, b) => {
      const aVal = a[options.sortBy!] as number;
      const bVal = b[options.sortBy!] as number;
      return (aVal - bVal) * dir;
    });
  }

  if (options.limit && options.limit > 0) {
    result = result.slice(0, options.limit);
  }

  return result;
}

export default class Screening {
  async screen(options: ScreenOptions = {}): Promise<ScreenResult[]> {
    const { exchange, filters = [], sortBy, order = "desc", limit } = options;

    const query = `query CompaniesListingInfo {
      CompaniesListingInfo {
        ticker organName enOrganName icbName3 enIcbName3 comTypeCode
        financialRatio {
          pe pb eps roe roa marketCap price priceChange volume
          exchange revenue netProfit de
        }
      }
    }`;

    const response = await fetchWithRetry<any>({
      url: GRAPHQL_URL,
      method: "POST",
      data: { query },
    });

    let stocks: ScreenResult[] = (response.data?.CompaniesListingInfo || [])
      .filter((item: any) => item.financialRatio)
      .map((item: any) => {
        const fr = item.financialRatio;
        return {
          symbol: item.ticker,
          companyName: item.organName || "",
          companyNameEn: item.enOrganName || "",
          industry: item.icbName3 || "",
          industryEn: item.enIcbName3 || "",
          exchange: fr.exchange || "",
          pe: fr.pe,
          pb: fr.pb,
          eps: fr.eps,
          roe: fr.roe,
          roa: fr.roa,
          marketCap: fr.marketCap,
          price: fr.price ? fr.price / 1000 : 0,
          priceChange: fr.priceChange ? fr.priceChange / 1000 : 0,
          volume: fr.volume || 0,
          revenue: fr.revenue,
          netProfit: fr.netProfit,
          debtToEquity: fr.de,
        } as ScreenResult;
      });

    if (exchange) {
      stocks = stocks.filter((s) => s.exchange === exchange);
    }

    return applyFilters(stocks, filters, { sortBy, order, limit });
  }
}
