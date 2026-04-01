import { fetchWithRetry } from "../../pipeline/fetch";
import { applyTransform } from "../../pipeline/transform";
import {
  companyProfileTransformConfig,
  shareholderTransformConfig,
  officerTransformConfig,
  eventTransformConfig,
  newsTransformConfig,
} from "../../pipeline/transform/configs/company";
import {
  CompanyProfile, Shareholder, Officer, CorporateEvent,
  StockNews, Subsidiary, Affiliate, AnalysisReport,
} from "../../models/normalized";
import { GRAPHQL_URL } from "../../shared/constants";

export class Company {
  private ticker: string;
  private overviewData: any = null;

  constructor(ticker: string) {
    this.ticker = ticker;
  }

  private async fetchOverview(): Promise<any> {
    if (this.overviewData) return this.overviewData;

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
        variables: { ticker: this.ticker, lang: "vi" },
      },
    });

    this.overviewData = response.data;
    return this.overviewData;
  }

  async overview(): Promise<any> {
    return this.fetchOverview();
  }

  async profile(): Promise<CompanyProfile> {
    const data = await this.fetchOverview();
    return applyTransform(
      data.CompanyListingInfo, companyProfileTransformConfig
    ) as unknown as CompanyProfile;
  }

  async shareholders(): Promise<Shareholder[]> {
    const data = await this.fetchOverview();
    return (data.OrganizationShareHolders || []).map(
      (s: any) => applyTransform(s, shareholderTransformConfig) as unknown as Shareholder
    );
  }

  async officers(): Promise<Officer[]> {
    const data = await this.fetchOverview();
    return (data.OrganizationManagers || []).map(
      (o: any) => applyTransform(o, officerTransformConfig) as unknown as Officer
    );
  }

  async events(): Promise<CorporateEvent[]> {
    const data = await this.fetchOverview();
    return (data.OrganizationEvents || []).map(
      (e: any) => applyTransform(e, eventTransformConfig) as unknown as CorporateEvent
    );
  }

  async news(): Promise<StockNews[]> {
    const data = await this.fetchOverview();
    return (data.News || []).map(
      (n: any) => applyTransform(n, newsTransformConfig) as unknown as StockNews
    );
  }

  async dividends(): Promise<CorporateEvent[]> {
    const events = await this.events();
    return events.filter((e) => e.eventType?.includes("DIVIDEND"));
  }

  async insiderDeals(): Promise<CorporateEvent[]> {
    const events = await this.events();
    return events.filter((e) => e.eventType?.includes("INSIDER_DEAL"));
  }

  async subsidiaries(): Promise<Subsidiary[]> {
    const data = await this.fetchOverview();
    return (data.Subsidiary || []).map((s: any) => ({
      id: s.id,
      companyCode: s.organCode,
      subsidiaryCode: s.subOrganCode,
      ownership: s.percentage,
      companyName: s.subOrListingInfo?.organName || "",
      companyNameEn: s.subOrListingInfo?.enOrganName || "",
    }));
  }

  async affiliates(): Promise<Affiliate[]> {
    const data = await this.fetchOverview();
    return (data.Affiliate || []).map((a: any) => ({
      id: a.id,
      companyCode: a.organCode,
      affiliateCode: a.subOrganCode,
      ownership: a.percentage,
      companyName: a.subOrListingInfo?.organName || "",
      companyNameEn: a.subOrListingInfo?.enOrganName || "",
    }));
  }

  async analysisReports(): Promise<AnalysisReport[]> {
    const data = await this.fetchOverview();
    return (data.AnalysisReportFiles || []).map((r: any) => ({
      date: r.date,
      description: r.description,
      link: r.link,
      name: r.name,
    }));
  }
}
