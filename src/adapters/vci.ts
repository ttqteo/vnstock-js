import { parse } from "date-fns";
import { fetchWithRetry } from "../pipeline/fetch";
import { applyTransform } from "../pipeline/transform";
import { transformQuoteHistory } from "../pipeline/transform/configs/quote";
import { tickerChangeTransformConfig } from "../pipeline/transform/configs/trading";
import { symbolTransformConfig } from "../pipeline/transform/configs/listing";
import {
  QuoteHistory, PriceBoardItem, TopStock, ListedSymbol,
  IndustryInfo, IndustryClassification,
} from "../models/normalized";
import {
  BASE_URL, CHART_URL, ALL_SYMBOLS_URL, VCI_HANDSHAKE_URL,
  VCI_IQ_URL, VCI_COMPANY_URL, VCI_EVENTS_URL, VCI_NEWS_URL,
  INTERVAL_MAP, PERIOD_MAP,
} from "../shared/constants";
import {
  StockDataAdapter, QuoteHistoryParams, FinancialParams, FinancialResult,
} from "./types";

var handshakeDone = false;
var handshakePromise: Promise<void> | null = null;

var NAMED_ENTITIES: Record<string, string> = {
  nbsp: " ", amp: "&", quot: '"', apos: "'", lt: "<", gt: ">",
  Agrave: "À", Aacute: "Á", Acirc: "Â", Atilde: "Ã", Auml: "Ä", Aring: "Å",
  agrave: "à", aacute: "á", acirc: "â", atilde: "ã", auml: "ä", aring: "å",
  Egrave: "È", Eacute: "É", Ecirc: "Ê", Euml: "Ë",
  egrave: "è", eacute: "é", ecirc: "ê", euml: "ë",
  Igrave: "Ì", Iacute: "Í", Icirc: "Î", Iuml: "Ï",
  igrave: "ì", iacute: "í", icirc: "î", iuml: "ï",
  Ograve: "Ò", Oacute: "Ó", Ocirc: "Ô", Otilde: "Õ", Ouml: "Ö",
  ograve: "ò", oacute: "ó", ocirc: "ô", otilde: "õ", ouml: "ö",
  Ugrave: "Ù", Uacute: "Ú", Ucirc: "Û", Uuml: "Ü",
  ugrave: "ù", uacute: "ú", ucirc: "û", uuml: "ü",
  Yacute: "Ý", yacute: "ý", yuml: "ÿ",
  Ntilde: "Ñ", ntilde: "ñ",
  Ccedil: "Ç", ccedil: "ç",
  szlig: "ß", AElig: "Æ", aelig: "æ", Oslash: "Ø", oslash: "ø",
  copy: "©", reg: "®", trade: "™",
  hellip: "…", mdash: "—", ndash: "–",
  lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”",
  laquo: "«", raquo: "»",
  middot: "·", bull: "•", deg: "°",
};

function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, function (_, code) {
    if (code.charAt(0) === "#") {
      var n = code.charAt(1) === "x" || code.charAt(1) === "X"
        ? parseInt(code.substring(2), 16)
        : parseInt(code.substring(1), 10);
      if (isFinite(n) && n > 0 && n < 0x10ffff) {
        try { return String.fromCodePoint(n); } catch (_) { return ""; }
      }
      return "";
    }
    return NAMED_ENTITIES[code] !== undefined ? NAMED_ENTITIES[code] : "&" + code + ";";
  });
}

function stripHtml(s: string): string {
  if (!s) return "";
  return decodeEntities(String(s).replace(/<[^>]*>/g, "")).trim();
}

function tsToDate(ts: number | string | null | undefined): string {
  if (ts === null || ts === undefined || ts === "") return "";
  if (typeof ts === "string") {
    var m = ts.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[1] + "-" + m[2] + "-" + m[3];
  }
  var n = typeof ts === "number" ? ts : Number(ts);
  if (!isFinite(n) || n <= 0) return "";
  if (n < 1e12) n = n * 1000;
  var d = new Date(n);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().substring(0, 10);
}

export class VciAdapter implements StockDataAdapter {
  readonly name = "VCI";

  private async ensureHandshake(): Promise<void> {
    if (handshakeDone) return;
    if (handshakePromise) return handshakePromise;
    handshakePromise = (async () => {
      try {
        await fetchWithRetry({
          url: VCI_HANDSHAKE_URL,
          method: "GET",
        }, { retries: 1 });
        handshakeDone = true;
      } catch {
        handshakeDone = true;
      } finally {
        handshakePromise = null;
      }
    })();
    return handshakePromise;
  }


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
      data: { symbols, from, to, timeFrame: mappedTimeFrame, countBack },
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
      data: { topStockType, timeFrame: mappedTimeFrame, exchangeCode: null, stockCodes: null },
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

  async fetchSymbolsByIndustries(lang: string = "vi"): Promise<IndustryInfo[]> {
    await this.ensureHandshake();
    const language = lang === "en" ? 2 : 1;
    const response = await fetchWithRetry<any>({
      url: `${VCI_IQ_URL}/v2/company/search-bar`,
      method: "GET",
      params: { language },
    });

    const items: any[] = Array.isArray(response) ? response : (response && response.data) || [];
    return items.map((t: any) => {
      const lv1 = t.icbLv1 || {};
      const lv2 = t.icbLv2 || {};
      const lv3 = t.icbLv3 || {};
      const lv4 = t.icbLv4 || {};
      return {
        symbol: t.code || "",
        companyName: t.name || "",
        companyNameEn: t.englishName || t.shortNameEn || "",
        industry: lv3.name || "",
        industryEn: lv3.nameEn || "",
        sector: lv2.name || "",
        sectorEn: lv2.nameEn || "",
        subIndustry: lv4.name || "",
        subIndustryEn: lv4.nameEn || "",
        companyType: t.comTypeCode || "",
        icbCode1: lv1.code || "",
        icbCode2: lv2.code || "",
        icbCode3: lv3.code || "",
        icbCode4: lv4.code || "",
      } as IndustryInfo;
    });
  }

  async fetchIndustriesIcb(): Promise<IndustryClassification[]> {
    await this.ensureHandshake();
    const response = await fetchWithRetry<any>({
      url: `${VCI_IQ_URL}/v1/sectors/icb-codes`,
      method: "GET",
    });

    const items: any[] = Array.isArray(response) ? response : (response && response.data) || [];
    return items.map((i: any) => ({
      code: i.name || "",
      level: String(i.icbLevel || ""),
      name: i.viSector || "",
      nameEn: i.enSector || "",
    }));
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
    await this.ensureHandshake();
    const { symbol, period = "quarter", reportKey } = params;
    const periodCode = PERIOD_MAP[period as keyof typeof PERIOD_MAP];

    const sectionMap: Record<string, string> = {
      "Chỉ tiêu cân đối kế toán": "BALANCE_SHEET",
      "Chỉ tiêu kết quả kinh doanh": "INCOME_STATEMENT",
      "Chỉ tiêu lưu chuyển tiền tệ": "CASH_FLOW",
    };
    const section = sectionMap[reportKey];

    const [statementResp, ratioResp, mappingResp] = await Promise.all([
      section
        ? fetchWithRetry<any>({
            url: `${VCI_COMPANY_URL}/${symbol}/financial-statement`,
            method: "GET",
            params: { section, period: periodCode },
          }).catch(() => null)
        : Promise.resolve(null),
      fetchWithRetry<any>({
        url: `${VCI_COMPANY_URL}/${symbol}/statistics-financial`,
        method: "GET",
        params: { period: periodCode },
      }).catch(() => null),
      fetchWithRetry<any>({
        url: `${VCI_COMPANY_URL}/${symbol}/financial-statement/metrics`,
        method: "GET",
      }).catch(() => null),
    ]);

    const statementData = (statementResp && statementResp.data) || null;
    const ratioPayload = ratioResp && (ratioResp.data !== undefined ? ratioResp.data : ratioResp);
    const ratioList: any[] = Array.isArray(ratioPayload) ? ratioPayload : [];
    const mappingPayload = mappingResp && (mappingResp.data !== undefined ? mappingResp.data : mappingResp);
    const mappingBySection: Record<string, any[]> = {};
    if (mappingPayload && typeof mappingPayload === "object" && !Array.isArray(mappingPayload)) {
      for (const k in mappingPayload) {
        if (Array.isArray((mappingPayload as any)[k])) {
          mappingBySection[k] = (mappingPayload as any)[k];
        }
      }
    }

    const data: Record<string, any> = { symbol };
    if (statementData) {
      data.years = Array.isArray(statementData.years) ? statementData.years : [];
      data.quarters = Array.isArray(statementData.quarters) ? statementData.quarters : [];
    } else {
      data.years = [];
      data.quarters = [];
    }
    data.ratio = ratioList;

    const sectionFields = section ? mappingBySection[section] || [] : [];

    return {
      data,
      mapping: {
        ratio: { type: reportKey, section, fields: sectionFields },
        unit: { BILLION: "billion", PERCENT: "%", INDEX: "index", MILLION: "million" },
      },
    };
  }


  async fetchCompanyOverview(ticker: string, lang: string): Promise<any> {
    await this.ensureHandshake();
    const language = lang === "en" ? 2 : 1;

    const now = new Date();
    const toDate = now.toISOString().substring(0, 10);
    const fromYear = now.getFullYear() - 10;
    const fromDate = fromYear + "-01-01";

    const [details, shStruct, shList, events, news] = await Promise.all([
      fetchWithRetry<any>({
        url: `${VCI_COMPANY_URL}/details`,
        method: "GET",
        params: { ticker, language },
      }).catch(() => null),
      fetchWithRetry<any>({
        url: `${VCI_COMPANY_URL}/${ticker}/shareholder-structure`,
        method: "GET",
      }).catch(() => null),
      fetchWithRetry<any>({
        url: `${VCI_COMPANY_URL}/${ticker}/shareholder`,
        method: "GET",
      }).catch(() => null),
      fetchWithRetry<any>({
        url: VCI_EVENTS_URL,
        method: "GET",
        params: { ticker, fromDate, toDate, page: 0, size: 50 },
      }).catch(() => null),
      fetchWithRetry<any>({
        url: VCI_NEWS_URL,
        method: "GET",
        params: { ticker, fromDate, toDate, page: 0, size: 50 },
      }).catch(() => null),
    ]);

    const d: any = (details && details.data) || details || {};
    const isVi = language === 1;
    const profile = isVi ? (d.viOrganProfile || d.profile || "") : (d.enOrganProfile || d.profile || "");
    const enProfile = d.enOrganProfile || d.profile || "";
    const history = isVi ? (d.viOrganHistory || d.history || "") : (d.enOrganHistory || d.history || "");
    const enHistory = d.enOrganHistory || d.history || "";

    const shStructData: any = (shStruct && shStruct.data) || {};
    const shListPayload = shList && (shList.data !== undefined ? shList.data : shList);
    const shListArr: any[] = Array.isArray(shListPayload) ? shListPayload : [];
    const shareholders = shListArr.filter((s) => s && s.ownerType !== "INDIVIDUAL_OFFICER");
    const officers = shListArr.filter((s) => s && (s.ownerType === "INDIVIDUAL_OFFICER" || s.positionName));

    const eventsPayload = events && (events.data !== undefined ? events.data : events);
    const eventsArr: any[] = Array.isArray(eventsPayload)
      ? eventsPayload
      : (eventsPayload && Array.isArray((eventsPayload as any).content)
          ? (eventsPayload as any).content
          : []);

    const newsPayload = news && (news.data !== undefined ? news.data : news);
    const newsArr: any[] = Array.isArray(newsPayload)
      ? newsPayload
      : (newsPayload && Array.isArray((newsPayload as any).content)
          ? (newsPayload as any).content
          : []);

    const CompanyListingInfo = {
      id: d.organCode || "",
      issueShare: d.numberOfSharesMktCap || 0,
      en_History: stripHtml(enHistory),
      history: stripHtml(history),
      en_CompanyProfile: stripHtml(enProfile),
      companyProfile: stripHtml(profile),
      icbName3: d.sectorVn || d.sector || "",
      enIcbName3: d.sector || "",
      icbName2: "",
      enIcbName2: "",
      icbName4: "",
      enIcbName4: "",
      financialRatio: {
        id: d.organCode || "",
        ticker,
        issueShare: d.numberOfSharesMktCap || 0,
        charterCapital: d.charterCapital || 0,
      },
    };

    const OrganizationShareHolders = shareholders.map((s: any, idx: number) => ({
      id: s.ownerCode || idx,
      ticker,
      ownerFullName: s.ownerName || "",
      en_OwnerFullName: s.ownerNameEn || "",
      quantity: s.quantity || 0,
      percentage: s.percentage || 0,
      updateDate: tsToDate(s.updateDate),
    }));

    const OrganizationManagers = officers.map((o: any, idx: number) => ({
      id: o.ownerCode || idx,
      ticker,
      fullName: o.ownerName || "",
      positionName: o.positionName || "",
      positionShortName: o.positionShortName || "",
      en_PositionName: o.positionNameEn || "",
      en_PositionShortName: "",
      updateDate: tsToDate(o.updateDate),
      percentage: o.percentage || 0,
      quantity: o.quantity || 0,
    }));

    const OrganizationEvents = eventsArr.map((e: any) => ({
      id: e.id || "",
      organCode: e.organCode || "",
      ticker: e.ticker || ticker,
      eventTitle: e.eventTitleVi || e.eventNameVi || "",
      en_EventTitle: e.eventTitleEn || e.eventNameEn || "",
      publicDate: tsToDate(e.publicDate),
      issueDate: tsToDate(e.displayDate1 || e.publicDate),
      sourceUrl: e.sourceUrl || "",
      eventListCode: e.eventCode || "",
      ratio: e.exerciseRatio || 0,
      value: e.exerciseValue || 0,
      recordDate: tsToDate(e.recordDate),
      exrightDate: tsToDate(e.exrightDate),
      eventListName: e.eventNameVi || e.category || "",
      en_EventListName: e.eventNameEn || e.category || "",
    }));

    const News = newsArr.map((n: any) => ({
      id: n.id || n.newsId || "",
      organCode: n.organCode || "",
      ticker: n.ticker || ticker,
      newsTitle: n.newsTitle || "",
      newsSubTitle: n.newsSubTitle || "",
      newsImageUrl: n.newsImageUrl || "",
      createdAt: tsToDate(n.createDate || n.publicDate),
      publicDate: tsToDate(n.publicDate),
      newsShortContent: stripHtml(n.newsShortContent || ""),
      newsFullContent: stripHtml(n.newsFullContent || ""),
      closePrice: 0,
      referencePrice: 0,
      floorPrice: 0,
      ceilingPrice: 0,
      percentPriceChange: 0,
    }));

    const TickerPriceInfo = {
      financialRatio: {},
      ticker,
      exchange: d.comGroupCode || "",
      ceilingPrice: 0,
      floorPrice: 0,
      referencePrice: 0,
      openPrice: 0,
      matchPrice: d.currentPrice || 0,
      closePrice: d.currentPrice || 0,
      priceChange: 0,
      percentPriceChange: 0,
      highestPrice: 0,
      lowestPrice: 0,
      totalVolume: 0,
      highestPrice1Year: d.highestPrice1Year || 0,
      lowestPrice1Year: d.lowestPrice1Year || 0,
      percentLowestPriceChange1Year: 0,
      percentHighestPriceChange1Year: 0,
      foreignTotalVolume: 0,
      foreignTotalRoom: 0,
      averageMatchVolume2Week: d.averageMatchVolume1Month || 0,
      foreignHoldingRoom: shStructData.foreignPercentage || d.foreignerPercentage || 0,
      currentHoldingRatio: shStructData.foreignPercentage || d.foreignerPercentage || 0,
      maxHoldingRatio: shStructData.maximumForeignPercentage || d.maximumForeignPercentage || 0,
    };

    return {
      AnalysisReportFiles: [],
      News,
      TickerPriceInfo,
      Subsidiary: [],
      Affiliate: [],
      CompanyListingInfo,
      OrganizationManagers,
      OrganizationShareHolders,
      OrganizationResignedManagers: [],
      OrganizationEvents,
    };
  }
}
