import { applyTransform } from "../pipeline/transform";
import { symbolTransformConfig } from "../pipeline/transform/configs/listing";
import { ListedSymbol, IndustryInfo, IndustryClassification } from "../models/normalized";
import {
  BASE_URL,
  CHART_URL,
  ALL_SYMBOLS_URL,
  VCI_HANDSHAKE_URL,
  VCI_IQ_URL,
  VCI_COMPANY_URL,
  VCI_EVENTS_URL,
  VCI_NEWS_URL,
  PERIOD_MAP,
} from "../shared/constants";
import { StockDataAdapter, FinancialParams, FinancialResult, BarsParams } from "./types";
import { Transport, RequestConfig, defaultTransport } from "../transport";
import { Bar, Quote } from "../types";
import { toBars, toQuote } from "./vci-transform";

/** The chart endpoint matches these index codes case-sensitively; callers often upper-case them. */
var VCI_INDEX_CASE: Record<string, string> = { HNXINDEX: "HNXIndex", HNXUPCOMINDEX: "HNXUpcomIndex" };

var handshakeDone = false;
var handshakePromise: Promise<void> | null = null;

var NAMED_ENTITIES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
  Agrave: "À",
  Aacute: "Á",
  Acirc: "Â",
  Atilde: "Ã",
  Auml: "Ä",
  Aring: "Å",
  agrave: "à",
  aacute: "á",
  acirc: "â",
  atilde: "ã",
  auml: "ä",
  aring: "å",
  Egrave: "È",
  Eacute: "É",
  Ecirc: "Ê",
  Euml: "Ë",
  egrave: "è",
  eacute: "é",
  ecirc: "ê",
  euml: "ë",
  Igrave: "Ì",
  Iacute: "Í",
  Icirc: "Î",
  Iuml: "Ï",
  igrave: "ì",
  iacute: "í",
  icirc: "î",
  iuml: "ï",
  Ograve: "Ò",
  Oacute: "Ó",
  Ocirc: "Ô",
  Otilde: "Õ",
  Ouml: "Ö",
  ograve: "ò",
  oacute: "ó",
  ocirc: "ô",
  otilde: "õ",
  ouml: "ö",
  Ugrave: "Ù",
  Uacute: "Ú",
  Ucirc: "Û",
  Uuml: "Ü",
  ugrave: "ù",
  uacute: "ú",
  ucirc: "û",
  uuml: "ü",
  Yacute: "Ý",
  yacute: "ý",
  yuml: "ÿ",
  Ntilde: "Ñ",
  ntilde: "ñ",
  Ccedil: "Ç",
  ccedil: "ç",
  szlig: "ß",
  AElig: "Æ",
  aelig: "æ",
  Oslash: "Ø",
  oslash: "ø",
  copy: "©",
  reg: "®",
  trade: "™",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  laquo: "«",
  raquo: "»",
  middot: "·",
  bull: "•",
  deg: "°",
};

function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, function (_, code) {
    if (code.charAt(0) === "#") {
      var n = code.charAt(1) === "x" || code.charAt(1) === "X" ? parseInt(code.substring(2), 16) : parseInt(code.substring(1), 10);
      if (isFinite(n) && n > 0 && n < 0x10ffff) {
        try {
          return String.fromCodePoint(n);
        } catch (_) {
          return "";
        }
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
  if (n < 1e12) n = n * 1000; // seconds to ms
  var d = new Date(n);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().substring(0, 10);
}

// Upper bound per calendar day: one daily bar, five or six hourly bars, and
// about 255 minutes of continuous matching on HOSE.
var BARS_PER_DAY: Record<string, number> = {
  ONE_DAY: 1,
  ONE_HOUR: 6,
  ONE_MINUTE: 255,
};

function barsInRange(from: number, to: number, timeFrame: string): number {
  var days = Math.ceil((to - from) / 86400) + 1;
  return Math.max(days, 1) * (BARS_PER_DAY[timeFrame] || 1);
}

export interface VciAdapterOptions {
  cache?: boolean;
  /** Transport for every request; defaults to the shared fetch transport. */
  transport?: Transport;
}

interface CacheEntry {
  data: any;
  expiresAt: number;
}

// Cache lifetimes in ms.
const CACHE_TTL_METRICS = 60 * 60 * 1000;
const CACHE_TTL_ICB = 60 * 60 * 1000;
const CACHE_TTL_SEARCH_BAR = 30 * 60 * 1000;

export class VciAdapter implements StockDataAdapter {
  readonly name = "VCI";

  private cacheEnabled: boolean;
  private cache: Map<string, CacheEntry> = new Map();
  private transport: Transport;

  constructor(options: VciAdapterOptions = {}) {
    this.cacheEnabled = options.cache !== false;
    this.transport = options.transport || defaultTransport;
  }

  private request<T = unknown>(config: RequestConfig): Promise<T> {
    return this.transport.request<T>(config);
  }

  private cacheGet(key: string): any | undefined {
    if (!this.cacheEnabled) return undefined;
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() >= entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.data;
  }

  private cacheSet(key: string, data: any, ttlMs: number): void {
    if (!this.cacheEnabled) return;
    this.cache.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  clearCache(): void {
    this.cache.clear();
  }

  private async fetchMetricsCached(symbol: string): Promise<any> {
    const cacheKey = `metrics:${symbol}`;
    const cached = this.cacheGet(cacheKey);
    if (cached !== undefined) return cached;
    const fresh = await this.request<any>({
      url: `${VCI_COMPANY_URL}/${symbol}/financial-statement/metrics`,
      method: "GET",
    }).catch(() => null);
    if (fresh !== null) this.cacheSet(cacheKey, fresh, CACHE_TTL_METRICS);
    return fresh;
  }

  private async ensureHandshake(): Promise<void> {
    if (handshakeDone) return;
    if (handshakePromise) return handshakePromise;
    handshakePromise = (async () => {
      try {
        await this.request({
          url: VCI_HANDSHAKE_URL,
          method: "GET",
        });
        handshakeDone = true;
      } catch {
        handshakeDone = true;
      } finally {
        handshakePromise = null;
      }
    })();
    return handshakePromise;
  }

  /**
   * Bars keyed by symbol, in dong (indices in points) with ICT `time`. VCI ignores `from` and
   * returns `countBack` bars ending at `to`, and daily bars are stamped 00:00 UTC with `to`
   * inclusive, so both bounds are read in UTC, countBack is sized from the range and the result
   * is trimmed to `from`, unless the caller passes countBack and owns the window.
   */
  async fetchBars(params: BarsParams): Promise<Record<string, Bar[]>> {
    const { symbols, frame } = params;
    // VCI takes unix seconds.
    const from = Date.parse(params.from + "T00:00:00Z") / 1000;
    const to = Date.parse(params.to + "T23:59:59Z") / 1000;
    const ownWindow = params.countBack === undefined;
    const countBack = ownWindow ? barsInRange(from, to, frame) : params.countBack;

    // VCI's spelling -> the caller's, so results come back under the key the caller asked for.
    const asked = new Map(symbols.map((s) => [VCI_INDEX_CASE[s.toUpperCase()] ?? s, s]));

    const rawData = await this.request<any[]>({
      url: CHART_URL,
      method: "POST",
      data: { symbols: Array.from(asked.keys()), from, to, timeFrame: frame, countBack },
    });

    const out: Record<string, Bar[]> = {};
    for (const s of symbols) out[s] = [];
    for (const chartData of rawData || []) {
      const bars = toBars(chartData, frame);
      out[asked.get(chartData.symbol) ?? chartData.symbol] = ownWindow ? bars.filter((b) => b.time >= params.from) : bars;
    }
    return out;
  }

  /** v2 price-board rows in dong. */
  async fetchQuotes(symbols: string[]): Promise<Quote[]> {
    const rawData = await this.request<any[]>({
      url: `${BASE_URL}/api/price/symbols/getList`,
      method: "POST",
      data: { symbols },
    });
    return (rawData || []).map(toQuote);
  }

  async fetchAllSymbols(): Promise<{ symbol: string; companyName: string }[]> {
    const rawData = await this.request<any>({
      url: ALL_SYMBOLS_URL,
      method: "GET",
    });

    return (rawData.ticker_info || []).map((t: any) => ({
      symbol: t.ticker_info?.ticker || t.ticker || "",
      companyName: t.ticker_info?.organ_name || t.organ_name || "",
    }));
  }

  async fetchSymbolsByExchange(): Promise<ListedSymbol[]> {
    const rawData = await this.request<any[]>({
      url: `${BASE_URL}/api/price/symbols/getAll`,
      method: "GET",
    });

    return rawData.map((s: any) => applyTransform(s, symbolTransformConfig) as unknown as ListedSymbol);
  }

  async fetchSymbolsByIndustries(lang: string = "vi"): Promise<IndustryInfo[]> {
    await this.ensureHandshake();
    const language = lang === "en" ? 2 : 1;
    const cacheKey = `search-bar:${language}`;
    let response = this.cacheGet(cacheKey);
    if (response === undefined) {
      response = await this.request<any>({
        url: `${VCI_IQ_URL}/v2/company/search-bar`,
        method: "GET",
        params: { language },
      });
      this.cacheSet(cacheKey, response, CACHE_TTL_SEARCH_BAR);
    }

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
    const cacheKey = "icb-codes";
    let response = this.cacheGet(cacheKey);
    if (response === undefined) {
      response = await this.request<any>({
        url: `${VCI_IQ_URL}/v1/sectors/icb-codes`,
        method: "GET",
      });
      this.cacheSet(cacheKey, response, CACHE_TTL_ICB);
    }

    const items: any[] = Array.isArray(response) ? response : (response && response.data) || [];
    return items.map((i: any) => ({
      code: i.name || "",
      level: String(i.icbLevel || ""),
      name: i.viSector || "",
      nameEn: i.enSector || "",
    }));
  }

  async fetchSymbolsByGroup(group: string): Promise<ListedSymbol[]> {
    const rawData = await this.request<any[]>({
      url: `${BASE_URL}/api/price/symbols/getByGroup`,
      method: "GET",
      params: { group },
    });

    return rawData.map((s: any) => applyTransform(s, symbolTransformConfig) as unknown as ListedSymbol);
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
        ? this.request<any>({
            url: `${VCI_COMPANY_URL}/${symbol}/financial-statement`,
            method: "GET",
            params: { section, period: periodCode },
          }).catch(() => null)
        : Promise.resolve(null),
      this.request<any>({
        url: `${VCI_COMPANY_URL}/${symbol}/statistics-financial`,
        method: "GET",
        params: { period: periodCode },
      }).catch(() => null),
      this.fetchMetricsCached(symbol),
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
      this.request<any>({
        url: `${VCI_COMPANY_URL}/details`,
        method: "GET",
        params: { ticker, language },
      }).catch(() => null),
      this.request<any>({
        url: `${VCI_COMPANY_URL}/${ticker}/shareholder-structure`,
        method: "GET",
      }).catch(() => null),
      this.request<any>({
        url: `${VCI_COMPANY_URL}/${ticker}/shareholder`,
        method: "GET",
      }).catch(() => null),
      this.request<any>({
        url: VCI_EVENTS_URL,
        method: "GET",
        params: { ticker, fromDate, toDate, page: 0, size: 50 },
      }).catch(() => null),
      this.request<any>({
        url: VCI_NEWS_URL,
        method: "GET",
        params: { ticker, fromDate, toDate, page: 0, size: 50 },
      }).catch(() => null),
    ]);

    const d: any = (details && details.data) || details || {};
    const isVi = language === 1;
    const profile = isVi ? d.viOrganProfile || d.profile || "" : d.enOrganProfile || d.profile || "";
    const enProfile = d.enOrganProfile || d.profile || "";
    const history = isVi ? d.viOrganHistory || d.history || "" : d.enOrganHistory || d.history || "";
    const enHistory = d.enOrganHistory || d.history || "";

    const shStructData: any = (shStruct && shStruct.data) || {};
    const shListPayload = shList && (shList.data !== undefined ? shList.data : shList);
    const shListArr: any[] = Array.isArray(shListPayload) ? shListPayload : [];
    const shareholders = shListArr.filter((s) => s && s.ownerType !== "INDIVIDUAL_OFFICER");
    const officers = shListArr.filter((s) => s && (s.ownerType === "INDIVIDUAL_OFFICER" || s.positionName));

    const eventsPayload = events && (events.data !== undefined ? events.data : events);
    const eventsArr: any[] = Array.isArray(eventsPayload)
      ? eventsPayload
      : eventsPayload && Array.isArray((eventsPayload as any).content)
        ? (eventsPayload as any).content
        : [];

    const newsPayload = news && (news.data !== undefined ? news.data : news);
    const newsArr: any[] = Array.isArray(newsPayload)
      ? newsPayload
      : newsPayload && Array.isArray((newsPayload as any).content)
        ? (newsPayload as any).content
        : [];

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
