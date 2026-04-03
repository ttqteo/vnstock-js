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
import { StockDataAdapter } from "../../adapters/types";
import { VciAdapter } from "../../adapters/vci";

export class Company {
  private ticker: string;
  private adapter: StockDataAdapter;
  private overviewData: any = null;

  constructor(ticker: string, adapter?: StockDataAdapter) {
    this.ticker = ticker;
    this.adapter = adapter || new VciAdapter();
  }

  private async fetchOverview(): Promise<any> {
    if (this.overviewData) return this.overviewData;

    this.overviewData = await this.adapter.fetchCompanyOverview(this.ticker, "vi");
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
