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

const BATCH_SIZE = 50;

export default class Screening {
  async screen(options: ScreenOptions = {}): Promise<ScreenResult[]> {
    const { exchange, filters = [], sortBy, order = "desc", limit } = options;

    // Step 1: Get all tickers with industry info
    const listingQuery = `query CompaniesListingInfo {
      CompaniesListingInfo {
        ticker organName enOrganName icbName3 enIcbName3
      }
    }`;

    const listingResponse = await fetchWithRetry<any>({
      url: GRAPHQL_URL,
      method: "POST",
      data: { query: listingQuery },
    });

    const listings = listingResponse.data?.CompaniesListingInfo || [];
    const listingMap: Record<string, any> = {};
    for (const item of listings) {
      listingMap[item.ticker] = item;
    }

    const tickers = listings.map((item: any) => item.ticker as string);

    // Step 2: Batch fetch financial data using GraphQL aliases
    const allPriceInfo: Record<string, any> = {};

    for (let i = 0; i < tickers.length; i += BATCH_SIZE) {
      const batch = tickers.slice(i, i + BATCH_SIZE);
      const aliases = batch
        .map((t: string, j: number) => {
          const alias = `t${i + j}`;
          return `${alias}: TickerPriceInfo(ticker: "${t}") { ticker exchange matchPrice closePrice totalVolume priceChange percentPriceChange financialRatio { pe pb eps roe roa de le revenue netProfit issueShare ev ps pcf bvps } }`;
        })
        .join("\n");

      const batchQuery = `query { ${aliases} }`;

      try {
        const response = await fetchWithRetry<any>({
          url: GRAPHQL_URL,
          method: "POST",
          data: { query: batchQuery },
        });

        if (response.data) {
          for (const key of Object.keys(response.data)) {
            const info = response.data[key];
            if (info?.ticker) {
              allPriceInfo[info.ticker] = info;
            }
          }
        }
      } catch {
        // Skip failed batches
      }
    }

    // Step 3: Combine listing + price info
    let stocks: ScreenResult[] = tickers
      .filter((t: string) => allPriceInfo[t]?.financialRatio)
      .map((t: string) => {
        const listing = listingMap[t] || {};
        const info = allPriceInfo[t];
        const fr = info.financialRatio;
        return {
          symbol: t,
          companyName: listing.organName || "",
          companyNameEn: listing.enOrganName || "",
          industry: listing.icbName3 || "",
          industryEn: listing.enIcbName3 || "",
          exchange: info.exchange || "",
          pe: fr.pe,
          pb: fr.pb,
          eps: fr.eps,
          roe: fr.roe,
          roa: fr.roa,
          marketCap: fr.issueShare && info.matchPrice
            ? (fr.issueShare * info.matchPrice) / 1000000000
            : 0,
          price: info.matchPrice ? info.matchPrice / 1000 : 0,
          priceChange: info.priceChange ? info.priceChange / 1000 : 0,
          volume: info.totalVolume || 0,
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
