import { TickerAnalysisReportFile } from "./TickerAnalysisReportFile";
import { TickerNews } from "./TickerNews";
import { TickerPriceInfo } from "./TickerPriceInfo";
import { TickerSubsidiary } from "./TickerSubsidiary";
import { TickerAffiliate } from "./TickerAffiliate";
import { CompanyListingInfo } from "./CompanyListingInfo";
import { OrganizationManager } from "./OrganizationManager";
import { OrganizationShareHolder } from "./OrganizationShareHolder";
import { OrganizationEvent } from "./OrganizationEvent";

export interface CompanyOverview {
  AnalysisReportFiles: TickerAnalysisReportFile[];
  News: TickerNews[];
  TickerPriceInfo: TickerPriceInfo;
  Subsidiary: TickerSubsidiary[];
  Affiliate: TickerAffiliate[];
  CompanyListingInfo: CompanyListingInfo;
  OrganizationManagers: OrganizationManager[];
  OrganizationShareHolders: OrganizationShareHolder[];
  OrganizationResignedManagers: OrganizationManager[];
  OrganizationEvents: OrganizationEvent[];
}
