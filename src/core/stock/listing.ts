import { fetchWithRetry } from "../../pipeline/fetch";
import { applyTransform } from "../../pipeline/transform";
import {
  symbolTransformConfig,
  tickerInfoTransformConfig,
  icbTransformConfig,
} from "../../pipeline/transform/configs/listing";
import { ListedSymbol, IndustryInfo, IndustryClassification } from "../../models/normalized";
import { BASE_URL, ALL_SYMBOLS_URL, GRAPHQL_URL, GROUP_CODE } from "../../shared/constants";

export default class Listing {
  async allSymbols(): Promise<{ symbol: string; companyName: string }[]> {
    const rawData = await fetchWithRetry<any>({
      url: ALL_SYMBOLS_URL,
      method: "GET",
    });

    return (rawData.ticker_info || []).map((t: any) => ({
      symbol: t.ticker_info?.ticker || t.ticker || "",
      companyName: t.ticker_info?.organ_name || t.organ_name || "",
    }));
  }

  async symbolsByExchange(): Promise<ListedSymbol[]> {
    const rawData = await fetchWithRetry<any[]>({
      url: `${BASE_URL}/api/price/symbols/getAll`,
      method: "GET",
    });

    return rawData.map(
      (s: any) => applyTransform(s, symbolTransformConfig) as unknown as ListedSymbol
    );
  }

  async symbolsByIndustries(): Promise<IndustryInfo[]> {
    const query = `query CompaniesListingInfo {
      CompaniesListingInfo {
        ticker organName enOrganName icbName3 enIcbName3 icbName2 enIcbName2 icbName4 enIcbName4 comTypeCode icbCode1 icbCode2 icbCode3 icbCode4
      }
    }`;

    const response = await fetchWithRetry<any>({
      url: GRAPHQL_URL,
      method: "POST",
      data: { query },
    });

    return (response.data?.CompaniesListingInfo || []).map(
      (t: any) => applyTransform(t, tickerInfoTransformConfig) as unknown as IndustryInfo
    );
  }

  async industriesIcb(): Promise<IndustryClassification[]> {
    const query = `query ListIcbCode {
      ListIcbCode { icbCode level icbName enIcbName }
    }`;

    const response = await fetchWithRetry<any>({
      url: GRAPHQL_URL,
      method: "POST",
      data: { query },
    });

    return (response.data?.ListIcbCode || []).map(
      (i: any) => applyTransform(i, icbTransformConfig) as unknown as IndustryClassification
    );
  }

  async symbolsByGroup(group: string = "VN30"): Promise<ListedSymbol[]> {
    if (!GROUP_CODE.includes(group)) {
      throw new Error(`Invalid group: ${group}. Valid groups: ${GROUP_CODE.join(", ")}`);
    }

    const rawData = await fetchWithRetry<any[]>({
      url: `${BASE_URL}/api/price/symbols/getByGroup`,
      method: "GET",
      params: { group },
    });

    return rawData.map(
      (s: any) => applyTransform(s, symbolTransformConfig) as unknown as ListedSymbol
    );
  }
}
