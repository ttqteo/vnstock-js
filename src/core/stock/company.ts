import axios from "axios";
import { GRAPHQL_URL } from "@/shared/constants";
import { CompanyOverview } from "@/models";

export default class Company {
  private ticker: string;
  private overviewData: CompanyOverview | null = null;

  constructor(ticker: string) {
    this.ticker = ticker;
    this.initialize();
  }

  private async initialize() {
    try {
      await this.fetchOverview();
    } catch (error) {
      console.error("Failed to initialize company data:", error);
    }
  }

  /**
   * Fetches comprehensive company overview data from the GraphQL API.
   * Caches the result for subsequent calls.
   * Lấy dữ liệu tổng quan toàn diện của công ty từ GraphQL API.
   * Lưu cache kết quả cho các lần gọi tiếp theo.
   */
  private async fetchOverview(): Promise<CompanyOverview> {
    if (this.overviewData) {
      return this.overviewData;
    }

    const url = GRAPHQL_URL;
    const payload = {
      query:
        "query Query($ticker: String!, $lang: String!) {\n  AnalysisReportFiles(ticker: $ticker, langCode: $lang) {\n    date\n    description\n    link\n    name\n    __typename\n  }\n  News(ticker: $ticker, langCode: $lang) {\n    id\n    organCode\n    ticker\n    newsTitle\n    newsSubTitle\n    friendlySubTitle\n    newsImageUrl\n    newsSourceLink\n    createdAt\n    publicDate\n    updatedAt\n    langCode\n    newsId\n    newsShortContent\n    newsFullContent\n    closePrice\n    referencePrice\n    floorPrice\n    ceilingPrice\n    percentPriceChange\n    __typename\n  }\n  TickerPriceInfo(ticker: $ticker) {\n    financialRatio {\n      yearReport\n      lengthReport\n      updateDate\n      revenue\n      revenueGrowth\n      netProfit\n      netProfitGrowth\n      ebitMargin\n      roe\n      roic\n      roa\n      pe\n      pb\n      eps\n      currentRatio\n      cashRatio\n      quickRatio\n      interestCoverage\n      ae\n      fae\n      netProfitMargin\n      grossMargin\n      ev\n      issueShare\n      ps\n      pcf\n      bvps\n      evPerEbitda\n      at\n      fat\n      acp\n      dso\n      dpo\n      epsTTM\n      charterCapital\n      RTQ4\n      charterCapitalRatio\n      RTQ10\n      dividend\n      ebitda\n      ebit\n      le\n      de\n      ccc\n      RTQ17\n      __typename\n    }\n    ticker\n    exchange\n    ev\n    ceilingPrice\n    floorPrice\n    referencePrice\n    openPrice\n    matchPrice\n    closePrice\n    priceChange\n    percentPriceChange\n    highestPrice\n    lowestPrice\n    totalVolume\n    highestPrice1Year\n    lowestPrice1Year\n    percentLowestPriceChange1Year\n    percentHighestPriceChange1Year\n    foreignTotalVolume\n    foreignTotalRoom\n    averageMatchVolume2Week\n    foreignHoldingRoom\n    currentHoldingRatio\n    maxHoldingRatio\n    __typename\n  }\n  Subsidiary(ticker: $ticker) {\n    id\n    organCode\n    subOrganCode\n    percentage\n    subOrListingInfo {\n      enOrganName\n      organName\n      __typename\n    }\n    __typename\n  }\n  Affiliate(ticker: $ticker) {\n    id\n    organCode\n    subOrganCode\n    percentage\n    subOrListingInfo {\n      enOrganName\n      organName\n      __typename\n    }\n    __typename\n  }\n  CompanyListingInfo(ticker: $ticker) {\n    id\n    issueShare\n    en_History\n    history\n    en_CompanyProfile\n    companyProfile\n    icbName3\n    enIcbName3\n    icbName2\n    enIcbName2\n    icbName4\n    enIcbName4\n    financialRatio {\n      id\n      ticker\n      issueShare\n      charterCapital\n      __typename\n    }\n    __typename\n  }\n  OrganizationManagers(ticker: $ticker) {\n    id\n    ticker\n    fullName\n    positionName\n    positionShortName\n    en_PositionName\n    en_PositionShortName\n    updateDate\n    percentage\n    quantity\n    __typename\n  }\n  OrganizationShareHolders(ticker: $ticker) {\n    id\n    ticker\n    ownerFullName\n    en_OwnerFullName\n    quantity\n    percentage\n    updateDate\n    __typename\n  }\n  OrganizationResignedManagers(ticker: $ticker) {\n    id\n    ticker\n    fullName\n    positionName\n    positionShortName\n    en_PositionName\n    en_PositionShortName\n    updateDate\n    percentage\n    quantity\n    __typename\n  }\n  OrganizationEvents(ticker: $ticker) {\n    id\n    organCode\n    ticker\n    eventTitle\n    en_EventTitle\n    publicDate\n    issueDate\n    sourceUrl\n    eventListCode\n    ratio\n    value\n    recordDate\n    exrightDate\n    eventListName\n    en_EventListName\n    __typename\n  }\n}\n",
      variables: { ticker: this.ticker, lang: "vi" },
    };

    try {
      const response = await axios.post(url, payload);
      if (response.status !== 200) {
        throw new Error(`Error fetching data: ${response.status} - ${JSON.stringify(response.data)}`);
      }

      let parsedData;
      if (typeof response.data === "string") {
        parsedData = JSON.parse(response.data);
      } else {
        parsedData = response.data;
      }

      if (!parsedData.data) {
        throw new Error("Invalid response structure: missing data");
      }

      this.overviewData = parsedData.data as CompanyOverview;
      return this.overviewData;
    } catch (error: any) {
      throw new Error(`An error occurred while fetching company overview: ${error.message}`);
    }
  }

  /**
   * Retrieves the complete company overview data.
   * Lấy toàn bộ dữ liệu tổng quan của công ty.
   */
  async overview(): Promise<CompanyOverview> {
    return this.fetchOverview();
  }

  /**
   * Retrieves the company's profile information including history and industry classification.
   * Lấy thông tin hồ sơ công ty bao gồm lịch sử và phân loại ngành.
   */
  async profile() {
    if (!this.overviewData) {
      await this.fetchOverview();
    }
    return this.overviewData!.CompanyListingInfo;
  }

  /**
   * Retrieves information about the company's shareholders.
   * Lấy thông tin về các cổ đông của công ty.
   */
  async shareholders() {
    if (!this.overviewData) {
      await this.fetchOverview();
    }
    return this.overviewData!.OrganizationShareHolders;
  }

  /**
   * Retrieves insider trading events for the company.
   * Lấy các sự kiện giao dịch nội bộ của công ty.
   */
  async insider_deals() {
    if (!this.overviewData) {
      await this.fetchOverview();
    }
    return this.overviewData!.OrganizationEvents.filter(
      (event) => event.eventListCode === "INSIDER_DEAL" || event.eventListName.toLowerCase().includes("insider")
    );
  }

  /**
   * Retrieves information about the company's subsidiaries.
   * Lấy thông tin về các công ty con của công ty.
   */
  async subsidiaries() {
    if (!this.overviewData) {
      await this.fetchOverview();
    }
    return this.overviewData!.Subsidiary;
  }

  /**
   * Retrieves information about the company's management team.
   * Lấy thông tin về đội ngũ quản lý của công ty.
   */
  async officers() {
    if (!this.overviewData) {
      await this.fetchOverview();
    }
    return this.overviewData!.OrganizationManagers;
  }

  /**
   * Retrieves all company events and announcements.
   * Lấy tất cả các sự kiện và thông báo của công ty.
   */
  async events() {
    if (!this.overviewData) {
      await this.fetchOverview();
    }
    return this.overviewData!.OrganizationEvents;
  }

  /**
   * Retrieves news articles related to the company.
   * Lấy các bài báo liên quan đến công ty.
   */
  async news() {
    if (!this.overviewData) {
      await this.fetchOverview();
    }
    return this.overviewData!.News;
  }

  /**
   * Retrieves dividend-related events for the company.
   * Lấy các sự kiện liên quan đến cổ tức của công ty.
   */
  async dividends() {
    if (!this.overviewData) {
      await this.fetchOverview();
    }
    return this.overviewData!.OrganizationEvents.filter(
      (event) => event.eventListCode === "DIVIDEND" || event.eventListName.toLowerCase().includes("dividend")
    );
  }
}
