import { parse } from "date-fns";
import { fetchWithRetry } from "../pipeline/fetch";
import { applyTransform } from "../pipeline/transform";
import { transformQuoteHistory } from "../pipeline/transform/configs/quote";
import { tickerChangeTransformConfig } from "../pipeline/transform/configs/trading";
import {
  symbolTransformConfig,
  tickerInfoTransformConfig,
  icbTransformConfig,
} from "../pipeline/transform/configs/listing";
import { financialTransformConfig } from "../pipeline/transform/configs/financial";
import {
  QuoteHistory, PriceBoardItem, TopStock, ListedSymbol,
  IndustryInfo, IndustryClassification,
} from "../models/normalized";
import {
  BASE_URL, CHART_URL, ALL_SYMBOLS_URL, GRAPHQL_URL,
  INTERVAL_MAP, PERIOD_MAP,
} from "../shared/constants";
import {
  StockDataAdapter, QuoteHistoryParams, FinancialParams, FinancialResult,
} from "./types";

export class VciAdapter implements StockDataAdapter {
  readonly name = "VCI";


  async fetchQuoteHistory(params: QuoteHistoryParams): Promise<QuoteHistory[]> {
    const { symbols, start, end, timeFrame, countBack = 365 } = params;

    const mappedTimeFrame = INTERVAL_MAP[timeFrame as keyof typeof INTERVAL_MAP];
    const from = parse(start, "yyyy-MM-dd", new Date()).getTime() / 1000;
    const now = new Date();
    now.setDate(now.getDate() + 2);
    const to = end
      ? parse(end, "yyyy-MM-dd", new Date()).getTime() / 1000
      : Math.floor(now.getTime() / 1000);

    const rawData = await fetchWithRetry<any[]>({
      url: CHART_URL,
      method: "POST",
      data: {
        symbols,
        from,
        to,
        timeFrame: mappedTimeFrame,
        countBack,
      },
    });

    const results: QuoteHistory[] = [];
    for (const chartData of rawData) {
      results.push(...transformQuoteHistory(chartData));
    }
    return results;
  }


  async fetchPriceBoard(symbols: string[]): Promise<PriceBoardItem[]> {
    const rawData = await fetchWithRetry<any[]>({
      url: `${BASE_URL}/api/price/symbols/getList`,
      method: "POST",
      data: { symbols },
    });

    return rawData.map((raw: any) => {
      const listing = raw.listingInfo || {};
      const match = raw.matchPrice || {};
      const bidAsk = raw.bidAsk || {};

      return {
        symbol: listing.symbol || "",
        companyName: listing.organName || "",
        companyNameEn: listing.enOrganName || "",
        exchange: listing.board || "",
        ceilingPrice: (listing.ceiling || 0) / 1000,
        floorPrice: (listing.floor || 0) / 1000,
        referencePrice: (listing.refPrice || 0) / 1000,
        price: (match.matchPrice || 0) / 1000,
        matchVolume: match.matchVol || 0,
        totalVolume: match.accumulatedVolume || 0,
        totalValue: match.accumulatedValue || 0,
        averagePrice: (match.avgMatchPrice || 0) / 1000,
        highestPrice: (match.highest || 0) / 1000,
        lowestPrice: (match.lowest || 0) / 1000,
        foreignBuyVolume: match.foreignBuyVolume || 0,
        foreignSellVolume: match.foreignSellVolume || 0,
        bidPrices: (bidAsk.bidPrices || []).map((b: any) => ({
          price: (b.price || 0) / 1000,
          volume: b.volume || 0,
        })),
        askPrices: (bidAsk.askPrices || []).map((a: any) => ({
          price: (a.price || 0) / 1000,
          volume: a.volume || 0,
        })),
      } as PriceBoardItem;
    });
  }

  async fetchTopStocks(timeFrame: string, type: "gainers" | "losers"): Promise<TopStock[]> {
    const mappedTimeFrame = INTERVAL_MAP[timeFrame as keyof typeof INTERVAL_MAP];
    const topStockType = type === "gainers" ? 1 : 0;

    const rawData = await fetchWithRetry<any[]>({
      url: `${BASE_URL}/api/price-alert-service/api/v1/non-authen/top-stock-change`,
      method: "POST",
      data: {
        topStockType,
        timeFrame: mappedTimeFrame,
        exchangeCode: null,
        stockCodes: null,
      },
    });

    return rawData.map((raw: any) =>
      applyTransform(raw, tickerChangeTransformConfig) as unknown as TopStock
    );
  }


  async fetchAllSymbols(): Promise<{ symbol: string; companyName: string }[]> {
    const rawData = await fetchWithRetry<any>({
      url: ALL_SYMBOLS_URL,
      method: "GET",
    });

    return (rawData.ticker_info || []).map((t: any) => ({
      symbol: t.ticker_info?.ticker || t.ticker || "",
      companyName: t.ticker_info?.organ_name || t.organ_name || "",
    }));
  }

  async fetchSymbolsByExchange(): Promise<ListedSymbol[]> {
    const rawData = await fetchWithRetry<any[]>({
      url: `${BASE_URL}/api/price/symbols/getAll`,
      method: "GET",
    });

    return rawData.map(
      (s: any) => applyTransform(s, symbolTransformConfig) as unknown as ListedSymbol
    );
  }

  async fetchSymbolsByIndustries(): Promise<IndustryInfo[]> {
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

  async fetchIndustriesIcb(): Promise<IndustryClassification[]> {
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

  async fetchSymbolsByGroup(group: string): Promise<ListedSymbol[]> {
    const rawData = await fetchWithRetry<any[]>({
      url: `${BASE_URL}/api/price/symbols/getByGroup`,
      method: "GET",
      params: { group },
    });

    return rawData.map(
      (s: any) => applyTransform(s, symbolTransformConfig) as unknown as ListedSymbol
    );
  }


  async fetchFinancialReport(params: FinancialParams & { reportKey: string }): Promise<FinancialResult> {
    const { symbol, period = "quarter", reportKey } = params;

    const [reportData, mappingData] = await Promise.all([
      this.getReport(symbol, period),
      this.getRatioMapping(),
    ]);

    const ratio = reportData.CompanyFinancialRatio?.ratio || {};
    const normalizedRatio = applyTransform(
      { ticker: symbol, ...ratio },
      financialTransformConfig
    );

    const mapping = mappingData.find((m: any) => m.type === reportKey);

    return {
      data: normalizedRatio,
      mapping: {
        ratio: mapping || {},
        unit: { BILLION: "billion", PERCENT: "%", INDEX: "index", MILLION: "million" },
      },
    };
  }

  private async getReport(symbol: string, period: string): Promise<any> {
    const periodCode = PERIOD_MAP[period as keyof typeof PERIOD_MAP];
    const query = `query CompanyFinancialRatio($ticker: String!, $period: String!) {
      CompanyFinancialRatio(ticker: $ticker, period: $period) {
        ratio { ticker yearReport lengthReport updateDate revenue revenueGrowth netProfit netProfitGrowth roe roic roa pe pb eps currentRatio cashRatio quickRatio interestCoverage ae fae netProfitMargin grossMargin ev issueShare ps pcf bvps evPerEbitda at fat acp dso dpo ccc de le ebitda ebit dividend RTQ4 charterCapital RTQ10 RTQ17 charterCapitalRatio epsTTM }
        period
      }
    }`;

    const response = await fetchWithRetry<any>({
      url: GRAPHQL_URL,
      method: "POST",
      data: {
        query,
        variables: { ticker: symbol, period: periodCode },
      },
    });

    return response.data;
  }

  private async getRatioMapping(): Promise<any[]> {
    const query = `query ListFinancialRatio {
      ListFinancialRatio { id type name unit isDefault fieldName en_Type en_Name tagName comTypeCode order }
    }`;

    const response = await fetchWithRetry<any>({
      url: GRAPHQL_URL,
      method: "POST",
      data: { query },
    });

    const ratios = response.data?.ListFinancialRatio || [];
    const grouped: Record<string, any> = {};

    for (const r of ratios) {
      if (!grouped[r.type]) {
        grouped[r.type] = { type: r.type, fields: [] };
      }
      grouped[r.type].fields.push(r);
    }

    return Object.values(grouped);
  }


  async fetchCompanyOverview(ticker: string, lang: string): Promise<any> {
    const query = `query Query($ticker: String!, $lang: String!) {
      AnalysisReportFiles(ticker: $ticker, langCode: $lang) { date description link name }
      News(ticker: $ticker, langCode: $lang) { id organCode ticker newsTitle newsSubTitle newsImageUrl createdAt publicDate newsShortContent newsFullContent closePrice referencePrice floorPrice ceilingPrice percentPriceChange }
      TickerPriceInfo(ticker: $ticker) { financialRatio { yearReport lengthReport updateDate revenue revenueGrowth netProfit netProfitGrowth roe roic roa pe pb eps currentRatio cashRatio quickRatio interestCoverage ae fae netProfitMargin grossMargin ev issueShare ps pcf bvps evPerEbitda at fat acp dso dpo ccc de le ebitda ebit charterCapital RTQ4 RTQ10 RTQ17 charterCapitalRatio epsTTM dividend } ticker exchange ceilingPrice floorPrice referencePrice openPrice matchPrice closePrice priceChange percentPriceChange highestPrice lowestPrice totalVolume highestPrice1Year lowestPrice1Year percentLowestPriceChange1Year percentHighestPriceChange1Year foreignTotalVolume foreignTotalRoom averageMatchVolume2Week foreignHoldingRoom currentHoldingRatio maxHoldingRatio }
      Subsidiary(ticker: $ticker) { id organCode subOrganCode percentage subOrListingInfo { enOrganName organName } }
      Affiliate(ticker: $ticker) { id organCode subOrganCode percentage subOrListingInfo { enOrganName organName } }
      CompanyListingInfo(ticker: $ticker) { id issueShare en_History history en_CompanyProfile companyProfile icbName3 enIcbName3 icbName2 enIcbName2 icbName4 enIcbName4 financialRatio { id ticker issueShare charterCapital } }
      OrganizationManagers(ticker: $ticker) { id ticker fullName positionName positionShortName en_PositionName en_PositionShortName updateDate percentage quantity }
      OrganizationShareHolders(ticker: $ticker) { id ticker ownerFullName en_OwnerFullName quantity percentage updateDate }
      OrganizationResignedManagers(ticker: $ticker) { id ticker fullName positionName positionShortName en_PositionName en_PositionShortName updateDate percentage quantity }
      OrganizationEvents(ticker: $ticker) { id organCode ticker eventTitle en_EventTitle publicDate issueDate sourceUrl eventListCode ratio value recordDate exrightDate eventListName en_EventListName }
    }`;

    const response = await fetchWithRetry<any>({
      url: GRAPHQL_URL,
      method: "POST",
      data: {
        query,
        variables: { ticker, lang },
      },
    });

    return response.data;
  }
}
