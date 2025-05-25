export interface CompanyListingInfo {
  id: string;
  issueShare: number;
  en_History: string;
  history: string;
  en_CompanyProfile: string;
  companyProfile: string;
  icbName3: string;
  enIcbName3: string;
  icbName2: string;
  enIcbName2: string;
  icbName4: string;
  enIcbName4: string;
  financialRatio: {
    id: string;
    ticker: string;
    issueShare: number;
    charterCapital: number;
  };
}
