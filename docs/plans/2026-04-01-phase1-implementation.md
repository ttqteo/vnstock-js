# Phase 1: Core Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor vnstock-js from raw API wrapper to Pipeline architecture with fully normalized output (Array of Objects, camelCase, price /1000, ISO dates).

**Architecture:** Pipeline pattern — every API call flows through Request Pipeline (fetch + retry) then Transform Pipeline (parse → clean → rename → normalize → shape). Each module has its own TransformConfig defining field mappings and normalization rules.

**Tech Stack:** TypeScript, axios, date-fns, ws, xlsx, Jest

---

## Task 1: Pipeline Infrastructure — Types & Transform Core

**Files:**
- Create: `src/pipeline/types.ts`
- Create: `src/pipeline/transform.ts`
- Test: `__tests__/pipeline/transform.test.ts`

**Step 1: Write the failing test**

Create `__tests__/pipeline/transform.test.ts`:

```typescript
import { applyTransform } from "../../src/pipeline/transform";
import { TransformConfig } from "../../src/pipeline/types";

describe("applyTransform", () => {
  const config: TransformConfig = {
    fieldMap: { o: "open", h: "high", l: "low", c: "close", v: "volume", t: "date" },
    priceFields: ["open", "high", "low", "close"],
    dateFields: ["date"],
    percentFields: [],
  };

  it("renames fields according to fieldMap", () => {
    const raw = { o: 25500, h: 26000, l: 25000, c: 25800, v: 1000000, t: 1705276800 };
    const result = applyTransform(raw, config);
    expect(result).toHaveProperty("open");
    expect(result).toHaveProperty("high");
    expect(result).not.toHaveProperty("o");
  });

  it("divides price fields by 1000", () => {
    const raw = { o: 25500, h: 26000, l: 25000, c: 25800, v: 1000000, t: 1705276800 };
    const result = applyTransform(raw, config);
    expect(result.open).toBe(25.5);
    expect(result.high).toBe(26.0);
    expect(result.close).toBe(25.8);
  });

  it("converts timestamp to ISO date string", () => {
    const raw = { o: 25500, h: 26000, l: 25000, c: 25800, v: 1000000, t: 1705276800 };
    const result = applyTransform(raw, config);
    expect(result.date).toBe("2024-01-15");
  });

  it("keeps non-price non-date fields as-is", () => {
    const raw = { o: 25500, h: 26000, l: 25000, c: 25800, v: 1000000, t: 1705276800 };
    const result = applyTransform(raw, config);
    expect(result.volume).toBe(1000000);
  });

  it("converts percent fields to decimal", () => {
    const pctConfig: TransformConfig = {
      fieldMap: { percentPriceChange: "priceChangePercent" },
      priceFields: [],
      dateFields: [],
      percentFields: ["priceChangePercent"],
    };
    const raw = { percentPriceChange: 5.23 };
    const result = applyTransform(raw, pctConfig);
    expect(result.priceChangePercent).toBeCloseTo(0.0523);
  });

  it("handles null and undefined values by removing them", () => {
    const raw = { o: 25500, h: null, l: undefined, c: 25800, v: 1000000, t: 1705276800 };
    const result = applyTransform(raw, config);
    expect(result).not.toHaveProperty("high");
    expect(result).not.toHaveProperty("low");
  });

  it("passes through fields not in fieldMap when keepExtra is true", () => {
    const raw = { o: 25500, extra: "hello", t: 1705276800 };
    const result = applyTransform(raw, { ...config, keepExtra: true });
    expect(result.extra).toBe("hello");
  });

  it("drops fields not in fieldMap when keepExtra is false/default", () => {
    const raw = { o: 25500, extra: "hello", t: 1705276800 };
    const result = applyTransform(raw, config);
    expect(result).not.toHaveProperty("extra");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest __tests__/pipeline/transform.test.ts --no-cache`
Expected: FAIL — cannot find module

**Step 3: Create types**

Create `src/pipeline/types.ts`:

```typescript
export interface TransformConfig {
  /** Maps raw API field name → normalized field name */
  fieldMap: Record<string, string>;
  /** Fields to divide by 1000 (applied AFTER rename) */
  priceFields: string[];
  /** Timestamp fields to convert to ISO date "YYYY-MM-DD" (applied AFTER rename) */
  dateFields: string[];
  /** Percentage fields to divide by 100 (applied AFTER rename) */
  percentFields: string[];
  /** If true, keep fields not in fieldMap. Default: false (drop them) */
  keepExtra?: boolean;
}

export interface RequestConfig {
  url: string;
  method: "GET" | "POST";
  data?: unknown;
  params?: Record<string, string | number>;
  headers?: Record<string, string>;
}

export interface FetchOptions {
  retries?: number;
  retryDelay?: number;
}
```

**Step 4: Implement transform**

Create `src/pipeline/transform.ts`:

```typescript
import { format, fromUnixTime } from "date-fns";
import { TransformConfig } from "./types";

export function applyTransform(raw: Record<string, unknown>, config: TransformConfig): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  // Rename + filter fields
  for (const [rawKey, value] of Object.entries(raw)) {
    if (value === null || value === undefined) continue;

    const newKey = config.fieldMap[rawKey];
    if (newKey) {
      result[newKey] = value;
    } else if (config.keepExtra) {
      result[rawKey] = value;
    }
  }

  // Price fields: divide by 1000
  for (const field of config.priceFields) {
    if (typeof result[field] === "number") {
      result[field] = (result[field] as number) / 1000;
    }
  }

  // Date fields: unix timestamp → ISO date string
  for (const field of config.dateFields) {
    if (typeof result[field] === "number") {
      result[field] = format(fromUnixTime(result[field] as number), "yyyy-MM-dd");
    }
  }

  // Percent fields: divide by 100
  for (const field of config.percentFields) {
    if (typeof result[field] === "number") {
      result[field] = (result[field] as number) / 100;
    }
  }

  return result;
}
```

**Step 5: Run test to verify it passes**

Run: `npx jest __tests__/pipeline/transform.test.ts --no-cache`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add src/pipeline/types.ts src/pipeline/transform.ts __tests__/pipeline/transform.test.ts
git commit -m "feat: add pipeline types and transform core"
```

---

## Task 2: Pipeline Infrastructure — Fetch & Retry

**Files:**
- Create: `src/pipeline/fetch.ts`
- Test: `__tests__/pipeline/fetch.test.ts`

**Step 1: Write the failing test**

Create `__tests__/pipeline/fetch.test.ts`:

```typescript
import axios from "axios";
import { fetchWithRetry } from "../../src/pipeline/fetch";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("fetchWithRetry", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("makes a GET request and returns data", async () => {
    mockedAxios.request.mockResolvedValueOnce({ data: { result: "ok" } });

    const result = await fetchWithRetry({
      url: "https://example.com/api",
      method: "GET",
    });

    expect(result).toEqual({ result: "ok" });
    expect(mockedAxios.request).toHaveBeenCalledTimes(1);
  });

  it("makes a POST request with data", async () => {
    mockedAxios.request.mockResolvedValueOnce({ data: [1, 2, 3] });

    const result = await fetchWithRetry({
      url: "https://example.com/api",
      method: "POST",
      data: { symbols: ["VCI"] },
    });

    expect(result).toEqual([1, 2, 3]);
    expect(mockedAxios.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "POST",
        data: { symbols: ["VCI"] },
      })
    );
  });

  it("retries on 5xx error and succeeds", async () => {
    const error5xx = { response: { status: 500 } };
    mockedAxios.request
      .mockRejectedValueOnce(error5xx)
      .mockResolvedValueOnce({ data: { ok: true } });

    const result = await fetchWithRetry(
      { url: "https://example.com/api", method: "GET" },
      { retries: 2, retryDelay: 10 }
    );

    expect(result).toEqual({ ok: true });
    expect(mockedAxios.request).toHaveBeenCalledTimes(2);
  });

  it("retries on timeout and succeeds", async () => {
    const timeoutError = { code: "ECONNABORTED" };
    mockedAxios.request
      .mockRejectedValueOnce(timeoutError)
      .mockResolvedValueOnce({ data: { ok: true } });

    const result = await fetchWithRetry(
      { url: "https://example.com/api", method: "GET" },
      { retries: 2, retryDelay: 10 }
    );

    expect(result).toEqual({ ok: true });
    expect(mockedAxios.request).toHaveBeenCalledTimes(2);
  });

  it("throws after all retries exhausted", async () => {
    const error5xx = { response: { status: 503 } };
    mockedAxios.request
      .mockRejectedValueOnce(error5xx)
      .mockRejectedValueOnce(error5xx)
      .mockRejectedValueOnce(error5xx);

    await expect(
      fetchWithRetry(
        { url: "https://example.com/api", method: "GET" },
        { retries: 2, retryDelay: 10 }
      )
    ).rejects.toEqual(error5xx);

    expect(mockedAxios.request).toHaveBeenCalledTimes(3);
  });

  it("does not retry on 4xx errors", async () => {
    const error4xx = { response: { status: 404 } };
    mockedAxios.request.mockRejectedValueOnce(error4xx);

    await expect(
      fetchWithRetry(
        { url: "https://example.com/api", method: "GET" },
        { retries: 2, retryDelay: 10 }
      )
    ).rejects.toEqual(error4xx);

    expect(mockedAxios.request).toHaveBeenCalledTimes(1);
  });

  it("includes default headers with Referer", async () => {
    mockedAxios.request.mockResolvedValueOnce({ data: {} });

    await fetchWithRetry({ url: "https://example.com/api", method: "GET" });

    expect(mockedAxios.request).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          Referer: expect.any(String),
        }),
      })
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest __tests__/pipeline/fetch.test.ts --no-cache`
Expected: FAIL — cannot find module

**Step 3: Implement fetch with retry**

Create `src/pipeline/fetch.ts`:

```typescript
import axios from "axios";
import { RequestConfig, FetchOptions } from "./types";
import { headers as defaultHeaders } from "../shared/constants";

function isRetryable(error: any): boolean {
  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") return true;
  if (error.response && error.response.status >= 500) return true;
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithRetry<T = unknown>(
  config: RequestConfig,
  options: FetchOptions = {}
): Promise<T> {
  const { retries = 2, retryDelay = 1000 } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await axios.request({
        url: config.url,
        method: config.method,
        data: config.data,
        params: config.params,
        headers: { ...defaultHeaders, ...config.headers },
      });
      return response.data as T;
    } catch (error) {
      lastError = error;
      if (attempt < retries && isRetryable(error)) {
        await sleep(retryDelay * Math.pow(2, attempt));
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest __tests__/pipeline/fetch.test.ts --no-cache`
Expected: ALL PASS

**Step 5: Create pipeline index**

Create `src/pipeline/index.ts`:

```typescript
export { applyTransform } from "./transform";
export { fetchWithRetry } from "./fetch";
export type { TransformConfig, RequestConfig, FetchOptions } from "./types";
```

**Step 6: Commit**

```bash
git add src/pipeline/fetch.ts src/pipeline/index.ts __tests__/pipeline/fetch.test.ts
git commit -m "feat: add fetch with retry middleware"
```

---

## Task 3: Transform Configs — Quote & Trading

**Files:**
- Create: `src/pipeline/transform/configs/quote.ts`
- Create: `src/pipeline/transform/configs/trading.ts`
- Test: `__tests__/pipeline/configs.test.ts`

**Step 1: Write the failing test**

Create `__tests__/pipeline/configs.test.ts`:

```typescript
import { applyTransform } from "../../src/pipeline/transform";
import { quoteTransformConfig, transformQuoteHistory } from "../../src/pipeline/transform/configs/quote";
import { priceBoardTransformConfig, tickerChangeTransformConfig } from "../../src/pipeline/transform/configs/trading";

describe("quoteTransformConfig", () => {
  it("transforms raw ChartData to QuoteHistory[]", () => {
    const rawChartData = {
      symbol: "VCI",
      o: [25500, 25800],
      h: [26000, 26200],
      l: [25000, 25300],
      c: [25800, 26100],
      v: [1000000, 1200000],
      t: [1705276800, 1705363200],
      accumulatedVolume: [1000000, 2200000],
      accumulatedValue: [25500000, 57300000],
      minBatchTruncTime: 1705276800,
    };

    const result = transformQuoteHistory(rawChartData);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      date: "2024-01-15",
      open: 25.5,
      high: 26.0,
      low: 25.0,
      close: 25.8,
      volume: 1000000,
    });
    expect(result[1]).toEqual({
      date: "2024-01-16",
      open: 25.8,
      high: 26.2,
      low: 25.3,
      close: 26.1,
      volume: 1200000,
    });
  });

  it("returns empty array for empty data", () => {
    const rawChartData = {
      symbol: "VCI",
      o: [], h: [], l: [], c: [], v: [], t: [],
      accumulatedVolume: [], accumulatedValue: [],
      minBatchTruncTime: 0,
    };
    const result = transformQuoteHistory(rawChartData);
    expect(result).toEqual([]);
  });
});

describe("tickerChangeTransformConfig", () => {
  it("transforms raw TickerChange to normalized object", () => {
    const raw = {
      stockCode: "FPT",
      lastPrice1DayAgo: 120000,
      lastPrice5DaysAgo: 118000,
      lastPrice20DaysAgo: 115000,
      group: "HOSE",
      marketCap: 95000000,
      topStockType: "GAINER_1_D",
      liquidity: 5000000,
      vn30: true,
      hnx30: false,
    };

    const result = applyTransform(raw, tickerChangeTransformConfig);

    expect(result.symbol).toBe("FPT");
    expect(result.price1DayAgo).toBe(120);
    expect(result.price5DaysAgo).toBe(118);
    expect(result.price20DaysAgo).toBe(115);
    expect(result.exchange).toBe("HOSE");
    expect(result.marketCap).toBe(95000000);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest __tests__/pipeline/configs.test.ts --no-cache`
Expected: FAIL — cannot find module

**Step 3: Create quote config**

Create `src/pipeline/transform/configs/quote.ts`:

```typescript
import { format, fromUnixTime } from "date-fns";
import { TransformConfig } from "../../types";

export const quoteTransformConfig: TransformConfig = {
  fieldMap: {
    o: "open",
    h: "high",
    l: "low",
    c: "close",
    v: "volume",
    t: "date",
  },
  priceFields: ["open", "high", "low", "close"],
  dateFields: ["date"],
  percentFields: [],
};

export interface QuoteHistory {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Transforms raw VietCap ChartData (column-based arrays) into Array of Objects.
 * This is a special transform because the raw data uses parallel arrays, not objects.
 */
export function transformQuoteHistory(raw: {
  o: number[];
  h: number[];
  l: number[];
  c: number[];
  v: number[];
  t: number[];
  [key: string]: unknown;
}): QuoteHistory[] {
  const length = raw.t?.length ?? 0;
  const result: QuoteHistory[] = [];

  for (let i = 0; i < length; i++) {
    result.push({
      date: format(fromUnixTime(raw.t[i]), "yyyy-MM-dd"),
      open: raw.o[i] / 1000,
      high: raw.h[i] / 1000,
      low: raw.l[i] / 1000,
      close: raw.c[i] / 1000,
      volume: raw.v[i],
    });
  }

  return result;
}
```

**Step 4: Create trading config**

Create `src/pipeline/transform/configs/trading.ts`:

```typescript
import { TransformConfig } from "../../types";

export const tickerChangeTransformConfig: TransformConfig = {
  fieldMap: {
    stockCode: "symbol",
    lastPrice1DayAgo: "price1DayAgo",
    lastPrice5DaysAgo: "price5DaysAgo",
    lastPrice20DaysAgo: "price20DaysAgo",
    group: "exchange",
    marketCap: "marketCap",
    topStockType: "type",
    liquidity: "liquidity",
    vn30: "vn30",
    hnx30: "hnx30",
  },
  priceFields: ["price1DayAgo", "price5DaysAgo", "price20DaysAgo"],
  dateFields: [],
  percentFields: [],
  keepExtra: false,
};

export const priceBoardTransformConfig = {
  listingInfo: {
    fieldMap: {
      symbol: "symbol",
      ceiling: "ceilingPrice",
      floor: "floorPrice",
      refPrice: "referencePrice",
      board: "exchange",
      organName: "companyName",
      enOrganName: "companyNameEn",
      listedShare: "listedShares",
    },
    priceFields: ["ceilingPrice", "floorPrice", "referencePrice"],
    dateFields: [],
    percentFields: [],
  } as TransformConfig,

  matchPrice: {
    fieldMap: {
      matchPrice: "price",
      matchVol: "matchVolume",
      accumulatedVolume: "totalVolume",
      accumulatedValue: "totalValue",
      avgMatchPrice: "averagePrice",
      highest: "highestPrice",
      lowest: "lowestPrice",
      foreignBuyVolume: "foreignBuyVolume",
      foreignSellVolume: "foreignSellVolume",
      referencePrice: "referencePrice",
    },
    priceFields: ["price", "averagePrice", "highestPrice", "lowestPrice", "referencePrice"],
    dateFields: [],
    percentFields: [],
  } as TransformConfig,
};
```

**Step 5: Run test to verify it passes**

Run: `npx jest __tests__/pipeline/configs.test.ts --no-cache`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add src/pipeline/transform/configs/quote.ts src/pipeline/transform/configs/trading.ts __tests__/pipeline/configs.test.ts
git commit -m "feat: add transform configs for quote and trading"
```

---

## Task 4: Transform Configs — Company, Financial, Listing, Commodity

**Files:**
- Create: `src/pipeline/transform/configs/company.ts`
- Create: `src/pipeline/transform/configs/financial.ts`
- Create: `src/pipeline/transform/configs/listing.ts`
- Create: `src/pipeline/transform/configs/commodity.ts`
- Create: `src/pipeline/transform/configs/index.ts`

**Step 1: Create company config**

Create `src/pipeline/transform/configs/company.ts`:

```typescript
import { TransformConfig } from "../../types";

export const companyProfileTransformConfig: TransformConfig = {
  fieldMap: {
    id: "id",
    issueShare: "issuedShares",
    history: "history",
    companyProfile: "profile",
    en_History: "historyEn",
    en_CompanyProfile: "profileEn",
    icbName3: "industry",
    enIcbName3: "industryEn",
    icbName2: "sector",
    enIcbName2: "sectorEn",
    icbName4: "subIndustry",
    enIcbName4: "subIndustryEn",
  },
  priceFields: [],
  dateFields: [],
  percentFields: [],
};

export const shareholderTransformConfig: TransformConfig = {
  fieldMap: {
    id: "id",
    ticker: "symbol",
    ownerFullName: "name",
    en_OwnerFullName: "nameEn",
    quantity: "quantity",
    percentage: "percentage",
    updateDate: "updatedAt",
  },
  priceFields: [],
  dateFields: ["updatedAt"],
  percentFields: ["percentage"],
};

export const officerTransformConfig: TransformConfig = {
  fieldMap: {
    id: "id",
    ticker: "symbol",
    fullName: "name",
    positionName: "position",
    en_PositionName: "positionEn",
    positionShortName: "positionShort",
    en_PositionShortName: "positionShortEn",
    updateDate: "updatedAt",
    percentage: "ownership",
    quantity: "quantity",
  },
  priceFields: [],
  dateFields: ["updatedAt"],
  percentFields: ["ownership"],
};

export const eventTransformConfig: TransformConfig = {
  fieldMap: {
    id: "id",
    organCode: "companyCode",
    ticker: "symbol",
    eventTitle: "title",
    en_EventTitle: "titleEn",
    publicDate: "publishedAt",
    issueDate: "issuedAt",
    sourceUrl: "sourceUrl",
    eventListCode: "eventType",
    eventListName: "eventTypeName",
    en_EventListName: "eventTypeNameEn",
    ratio: "ratio",
    value: "value",
    recordDate: "recordDate",
    exrightDate: "exRightDate",
  },
  priceFields: [],
  dateFields: ["publishedAt", "issuedAt", "recordDate", "exRightDate"],
  percentFields: [],
};

export const newsTransformConfig: TransformConfig = {
  fieldMap: {
    id: "id",
    ticker: "symbol",
    newsTitle: "title",
    newsSubTitle: "subtitle",
    newsImageUrl: "imageUrl",
    newsSourceLink: "sourceUrl",
    publicDate: "publishedAt",
    newsShortContent: "summary",
    newsFullContent: "content",
    closePrice: "closePrice",
    referencePrice: "referencePrice",
    percentPriceChange: "priceChangePercent",
  },
  priceFields: ["closePrice", "referencePrice"],
  dateFields: ["publishedAt"],
  percentFields: ["priceChangePercent"],
};

export const subsidiaryTransformConfig: TransformConfig = {
  fieldMap: {
    id: "id",
    organCode: "companyCode",
    subOrganCode: "subsidiaryCode",
    percentage: "ownership",
  },
  priceFields: [],
  dateFields: [],
  percentFields: ["ownership"],
  keepExtra: true,
};
```

**Step 2: Create financial config**

Create `src/pipeline/transform/configs/financial.ts`:

```typescript
import { TransformConfig } from "../../types";

// Financial data is complex — the raw response has 100+ fields.
// We keep all fields but rename the wrapper structure.
// Individual ratio fields are already camelCase from GraphQL.
export const financialTransformConfig: TransformConfig = {
  fieldMap: {
    ticker: "symbol",
    yearReport: "year",
    lengthReport: "quarter",
    updateDate: "updatedAt",
    revenue: "revenue",
    revenueGrowth: "revenueGrowth",
    netProfit: "netProfit",
    netProfitGrowth: "netProfitGrowth",
    roe: "roe",
    roic: "roic",
    roa: "roa",
    pe: "pe",
    pb: "pb",
    eps: "eps",
    epsTTM: "epsTTM",
    currentRatio: "currentRatio",
    cashRatio: "cashRatio",
    quickRatio: "quickRatio",
    de: "debtToEquity",
    le: "longTermDebtToEquity",
    ebitda: "ebitda",
    ebit: "ebit",
    netProfitMargin: "netProfitMargin",
    grossMargin: "grossMargin",
    ev: "enterpriseValue",
    issueShare: "issuedShares",
    ps: "ps",
    pcf: "pcf",
    bvps: "bookValuePerShare",
    evPerEbitda: "evToEbitda",
    dividend: "dividend",
    charterCapital: "charterCapital",
  },
  priceFields: [],
  dateFields: ["updatedAt"],
  percentFields: ["roe", "roic", "roa", "revenueGrowth", "netProfitGrowth", "netProfitMargin", "grossMargin"],
  keepExtra: true,
};
```

**Step 3: Create listing config**

Create `src/pipeline/transform/configs/listing.ts`:

```typescript
import { TransformConfig } from "../../types";

export const symbolTransformConfig: TransformConfig = {
  fieldMap: {
    id: "id",
    symbol: "symbol",
    type: "type",
    board: "exchange",
    enOrganName: "companyNameEn",
    enOrganShortName: "companyShortNameEn",
    organName: "companyName",
    organShortName: "companyShortName",
  },
  priceFields: [],
  dateFields: [],
  percentFields: [],
};

export const tickerInfoTransformConfig: TransformConfig = {
  fieldMap: {
    ticker: "symbol",
    organName: "companyName",
    enOrganName: "companyNameEn",
    icbName3: "industry",
    enIcbName3: "industryEn",
    icbName2: "sector",
    enIcbName2: "sectorEn",
    icbName4: "subIndustry",
    enIcbName4: "subIndustryEn",
    comTypeCode: "companyType",
    icbCode1: "icbCode1",
    icbCode2: "icbCode2",
    icbCode3: "icbCode3",
    icbCode4: "icbCode4",
  },
  priceFields: [],
  dateFields: [],
  percentFields: [],
};

export const icbTransformConfig: TransformConfig = {
  fieldMap: {
    icbCode: "code",
    level: "level",
    icbName: "name",
    enIcbName: "nameEn",
  },
  priceFields: [],
  dateFields: [],
  percentFields: [],
};
```

**Step 4: Create commodity config**

Create `src/pipeline/transform/configs/commodity.ts`:

```typescript
import { TransformConfig } from "../../types";

export const goldBtmcTransformConfig: TransformConfig = {
  fieldMap: {
    name: "name",
    kara: "karat",
    vol: "weight",
    buy: "buyPrice",
    sell: "sellPrice",
    world: "worldPrice",
    updatedAt: "updatedAt",
  },
  priceFields: [],
  dateFields: [],
  percentFields: [],
};

export const goldSjcTransformConfig: TransformConfig = {
  fieldMap: {
    Id: "id",
    TypeName: "type",
    BranchName: "branch",
    BuyValue: "buyPrice",
    SellValue: "sellPrice",
    BuyDifferValue: "buyChange",
    SellDifferValue: "sellChange",
  },
  priceFields: [],
  dateFields: [],
  percentFields: [],
};

export const exchangeRateTransformConfig: TransformConfig = {
  fieldMap: {
    CurrencyCode: "currencyCode",
    CurrencyName: "currencyName",
    "Buy Cash": "buyCash",
    "Buy Transfer": "buyTransfer",
    Sell: "sell",
  },
  priceFields: [],
  dateFields: [],
  percentFields: [],
};
```

**Step 5: Create configs index**

Create `src/pipeline/transform/configs/index.ts`:

```typescript
export * from "./quote";
export * from "./trading";
export * from "./company";
export * from "./financial";
export * from "./listing";
export * from "./commodity";
```

**Step 6: Commit**

```bash
git add src/pipeline/transform/configs/
git commit -m "feat: add transform configs for all modules"
```

---

## Task 5: New TypeScript Interfaces (Normalized Output)

**Files:**
- Create: `src/models/normalized.ts`

**Step 1: Create normalized output types**

Create `src/models/normalized.ts`:

```typescript
// ============ QUOTE ============

export interface QuoteHistory {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ============ TRADING ============

export interface PriceBoardItem {
  symbol: string;
  companyName: string;
  companyNameEn: string;
  exchange: string;
  ceilingPrice: number;
  floorPrice: number;
  referencePrice: number;
  price: number;
  matchVolume: number;
  totalVolume: number;
  totalValue: number;
  averagePrice: number;
  highestPrice: number;
  lowestPrice: number;
  foreignBuyVolume: number;
  foreignSellVolume: number;
  bidPrices: { price: number; volume: number }[];
  askPrices: { price: number; volume: number }[];
}

export interface TopStock {
  symbol: string;
  price1DayAgo: number;
  price5DaysAgo: number;
  price20DaysAgo: number;
  exchange: string;
  marketCap: number;
  type: string;
  liquidity: number;
  vn30: boolean;
  hnx30: boolean;
}

// ============ COMPANY ============

export interface CompanyProfile {
  id: string;
  issuedShares: number;
  history: string;
  historyEn: string;
  profile: string;
  profileEn: string;
  industry: string;
  industryEn: string;
  sector: string;
  sectorEn: string;
  subIndustry: string;
  subIndustryEn: string;
}

export interface Shareholder {
  id: string;
  symbol: string;
  name: string;
  nameEn: string;
  quantity: number;
  percentage: number;
  updatedAt: string;
}

export interface Officer {
  id: string;
  symbol: string;
  name: string;
  position: string;
  positionEn: string;
  positionShort: string;
  positionShortEn: string;
  updatedAt: string;
  ownership: number;
  quantity: number;
}

export interface CorporateEvent {
  id: string;
  companyCode: string;
  symbol: string;
  title: string;
  titleEn: string;
  publishedAt: string;
  issuedAt: string;
  sourceUrl: string;
  eventType: string;
  eventTypeName: string;
  eventTypeNameEn: string;
  ratio: number | null;
  value: number | null;
  recordDate: string;
  exRightDate: string;
}

export interface StockNews {
  id: string;
  symbol: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  sourceUrl: string;
  publishedAt: string;
  summary: string;
  content: string;
  closePrice: number;
  referencePrice: number;
  priceChangePercent: number;
}

export interface Subsidiary {
  id: string;
  companyCode: string;
  subsidiaryCode: string;
  ownership: number;
  companyName: string;
  companyNameEn: string;
}

export interface Affiliate {
  id: string;
  companyCode: string;
  affiliateCode: string;
  ownership: number | null;
  companyName: string;
  companyNameEn: string;
}

export interface AnalysisReport {
  date: string;
  description: string;
  link: string;
  name: string;
}

// ============ FINANCIAL ============

export interface FinancialStatement {
  symbol: string;
  year: number;
  quarter: number;
  updatedAt: string;
  [key: string]: unknown;
}

// ============ LISTING ============

export interface ListedSymbol {
  id: number;
  symbol: string;
  type: string;
  exchange: string;
  companyName: string;
  companyNameEn: string;
  companyShortName: string;
  companyShortNameEn: string;
}

export interface IndustryInfo {
  symbol: string;
  companyName: string;
  companyNameEn: string;
  industry: string;
  industryEn: string;
  sector: string;
  sectorEn: string;
  subIndustry: string;
  subIndustryEn: string;
  companyType: string;
  icbCode1: string;
  icbCode2: string;
  icbCode3: string;
  icbCode4: string;
}

export interface IndustryClassification {
  code: string;
  level: string;
  name: string;
  nameEn: string;
}

// ============ COMMODITY ============

export interface GoldPriceBtmc {
  name: string;
  karat: string;
  weight: string;
  buyPrice: string;
  sellPrice: string;
  worldPrice: string;
  updatedAt: string;
}

export interface GoldPriceSjc {
  id: number;
  type: string;
  branch: string;
  buyPrice: number;
  sellPrice: number;
  buyChange: number;
  sellChange: number;
}

export interface ExchangeRate {
  currencyCode: string;
  currencyName: string;
  buyCash: string;
  buyTransfer: string;
  sell: string;
}

// ============ REALTIME ============

export interface RealtimeQuote {
  exchange: string;
  symbol: string;
  bidPrices: { price: number; volume: number }[];
  askPrices: { price: number; volume: number }[];
  matched: { price: number; volume: number; change: number; changePercent: number };
  totalBuyVolume: number;
  totalBuyValue: number;
  totalVolume: number;
  totalValue: number;
  side: "buy" | "sell";
  lastUpdated: number;
}
```

**Step 2: Commit**

```bash
git add src/models/normalized.ts
git commit -m "feat: add normalized output TypeScript interfaces"
```

---

## Task 6: Refactor Quote Module

**Files:**
- Modify: `src/core/stock/quote.ts`
- Test: `__tests__/quote.test.ts`

**Step 1: Update the test**

Replace `__tests__/quote.test.ts` with normalized output expectations:

```typescript
import vnstock from "../src";

describe("Quote", () => {
  it("should return normalized history for a symbol", async () => {
    const data = await vnstock.stock.quote.history({
      symbols: ["VCI"],
      start: "2024-01-01",
      end: "2024-01-31",
      timeFrame: "1D",
    });

    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    const item = data[0];
    // Check normalized field names
    expect(item).toHaveProperty("date");
    expect(item).toHaveProperty("open");
    expect(item).toHaveProperty("high");
    expect(item).toHaveProperty("low");
    expect(item).toHaveProperty("close");
    expect(item).toHaveProperty("volume");

    // Check old fields are gone
    expect(item).not.toHaveProperty("o");
    expect(item).not.toHaveProperty("h");
    expect(item).not.toHaveProperty("t");

    // Check types
    expect(typeof item.date).toBe("string");
    expect(item.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(typeof item.open).toBe("number");
    expect(typeof item.volume).toBe("number");

    // Check price is divided by 1000 (prices should be < 1000 for most stocks)
    expect(item.open).toBeLessThan(1000);
    expect(item.close).toBeLessThan(1000);
  }, 30000);

  it("should return normalized history for VNINDEX", async () => {
    const data = await vnstock.stock.quote.history({
      symbols: ["VNINDEX"],
      start: "2024-01-01",
      end: "2024-01-31",
      timeFrame: "1D",
    });

    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty("date");
    expect(data[0]).toHaveProperty("close");
  }, 30000);
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest __tests__/quote.test.ts --no-cache`
Expected: FAIL — old format returns ChartData[] not QuoteHistory[]

**Step 3: Refactor quote.ts**

Replace `src/core/stock/quote.ts`:

```typescript
import { parse } from "date-fns";
import { fetchWithRetry } from "../../pipeline/fetch";
import { transformQuoteHistory, QuoteHistory } from "../../pipeline/transform/configs/quote";
import { CHART_URL, INTERVAL_MAP } from "../../shared/constants";
import { validateDateFormat, inputValidation } from "../../shared/utils";

export class Quote {
  async history(options: {
    symbols: string[];
    start: string;
    end?: string;
    timeFrame: string;
    countBack?: number;
  }): Promise<QuoteHistory[]> {
    const { symbols, start, end, timeFrame, countBack = 365 } = options;

    inputValidation(timeFrame);
    validateDateFormat([start, ...(end ? [end] : [])]);

    const mappedTimeFrame = INTERVAL_MAP[timeFrame as keyof typeof INTERVAL_MAP];
    const from = parse(start, "yyyy-MM-dd", new Date()).getTime() / 1000;
    const now = new Date();
    now.setDate(now.getDate() + 2);
    const to = end
      ? parse(end, "yyyy-MM-dd", new Date()).getTime() / 1000
      : Math.floor(now.getTime() / 1000);

    if (from > to) {
      throw new Error("Start date must be before end date");
    }

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

    // Flatten: API returns array of ChartData (one per symbol)
    // Transform each into QuoteHistory[] and concat
    const results: QuoteHistory[] = [];
    for (const chartData of rawData) {
      results.push(...transformQuoteHistory(chartData));
    }

    return results;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest __tests__/quote.test.ts --no-cache`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/core/stock/quote.ts __tests__/quote.test.ts
git commit -m "refactor: quote module uses pipeline with normalized output"
```

---

## Task 7: Refactor Trading Module

**Files:**
- Modify: `src/core/stock/trading.ts`
- Test: `__tests__/trading.test.ts`

**Step 1: Update the test**

Replace `__tests__/trading.test.ts`:

```typescript
import vnstock from "../src";

describe("Trading", () => {
  it("should return normalized price board", async () => {
    const data = await vnstock.stock.trading.priceBoard(["VCI"]);

    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    const item = data[0];
    expect(item).toHaveProperty("symbol");
    expect(item).toHaveProperty("price");
    expect(item).toHaveProperty("totalVolume");
    expect(item).toHaveProperty("ceilingPrice");
    expect(item).toHaveProperty("floorPrice");
    expect(item).toHaveProperty("referencePrice");
    expect(item).toHaveProperty("bidPrices");
    expect(item).toHaveProperty("askPrices");

    // Check prices are divided by 1000
    expect(item.price).toBeLessThan(1000);
    expect(item.ceilingPrice).toBeLessThan(1000);

    // Check old nested structure is gone
    expect(item).not.toHaveProperty("listingInfo");
    expect(item).not.toHaveProperty("bidAsk");
    expect(item).not.toHaveProperty("matchPrice");
  }, 30000);

  it("should return normalized top gainers", async () => {
    const data = await vnstock.stock.trading.topGainers();

    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    const item = data[0];
    expect(item).toHaveProperty("symbol");
    expect(item).toHaveProperty("exchange");
    expect(item).toHaveProperty("marketCap");
    expect(item).not.toHaveProperty("stockCode");
    expect(item).not.toHaveProperty("group");
  }, 30000);

  it("should return normalized top losers", async () => {
    const data = await vnstock.stock.trading.topLosers();

    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty("symbol");
  }, 30000);
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest __tests__/trading.test.ts --no-cache`
Expected: FAIL

**Step 3: Refactor trading.ts**

Replace `src/core/stock/trading.ts`:

```typescript
import { fetchWithRetry } from "../../pipeline/fetch";
import { applyTransform } from "../../pipeline/transform";
import { tickerChangeTransformConfig } from "../../pipeline/transform/configs/trading";
import { PriceBoardItem, TopStock } from "../../models/normalized";
import { BASE_URL, INTERVAL_MAP } from "../../shared/constants";
import { inputValidation } from "../../shared/utils";

export class Trading {
  async priceBoard(symbols: string[]): Promise<PriceBoardItem[]> {
    if (!symbols || symbols.length === 0) {
      throw new Error("Symbols array must not be empty");
    }

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

  async topGainers(timeFrame: string = "1D"): Promise<TopStock[]> {
    return this._topStocks(timeFrame, 1);
  }

  async topLosers(timeFrame: string = "1D"): Promise<TopStock[]> {
    return this._topStocks(timeFrame, 0);
  }

  private async _topStocks(timeFrame: string, topStockType: number): Promise<TopStock[]> {
    inputValidation(timeFrame);
    const mappedTimeFrame = INTERVAL_MAP[timeFrame as keyof typeof INTERVAL_MAP];

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
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest __tests__/trading.test.ts --no-cache`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/core/stock/trading.ts __tests__/trading.test.ts
git commit -m "refactor: trading module uses pipeline with normalized output"
```

---

## Task 8: Refactor Company Module

**Files:**
- Modify: `src/core/stock/company.ts`
- Test: `__tests__/company.test.ts`

**Step 1: Update the test**

Replace `__tests__/company.test.ts`:

```typescript
import vnstock from "../src";
import { Company } from "../src/core/stock/company";

describe("Company", () => {
  let company: Company;

  beforeAll(() => {
    company = new Company("VCI");
  });

  it("should return normalized profile", async () => {
    const data = await company.profile();
    expect(data).toHaveProperty("industry");
    expect(data).toHaveProperty("industryEn");
    expect(data).toHaveProperty("issuedShares");
    expect(data).not.toHaveProperty("issueShare");
    expect(data).not.toHaveProperty("icbName3");
  }, 30000);

  it("should return normalized shareholders", async () => {
    const data = await company.shareholders();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty("name");
    expect(data[0]).toHaveProperty("percentage");
    expect(data[0]).not.toHaveProperty("ownerFullName");
  }, 30000);

  it("should return normalized officers", async () => {
    const data = await company.officers();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty("name");
    expect(data[0]).toHaveProperty("position");
    expect(data[0]).not.toHaveProperty("fullName");
    expect(data[0]).not.toHaveProperty("positionName");
  }, 30000);

  it("should return normalized events", async () => {
    const data = await company.events();
    expect(Array.isArray(data)).toBe(true);
    if (data.length > 0) {
      expect(data[0]).toHaveProperty("title");
      expect(data[0]).toHaveProperty("eventType");
      expect(data[0]).not.toHaveProperty("eventTitle");
      expect(data[0]).not.toHaveProperty("eventListCode");
    }
  }, 30000);

  it("should return normalized news", async () => {
    const data = await company.news();
    expect(Array.isArray(data)).toBe(true);
    if (data.length > 0) {
      expect(data[0]).toHaveProperty("title");
      expect(data[0]).toHaveProperty("summary");
      expect(data[0]).not.toHaveProperty("newsTitle");
      expect(data[0]).not.toHaveProperty("newsShortContent");
    }
  }, 30000);

  it("should return normalized dividends", async () => {
    const data = await company.dividends();
    expect(Array.isArray(data)).toBe(true);
    if (data.length > 0) {
      expect(data[0]).toHaveProperty("eventType");
      expect(data[0].eventType).toContain("DIVIDEND");
    }
  }, 30000);

  it("should return normalized insider deals", async () => {
    const data = await company.insiderDeals();
    expect(Array.isArray(data)).toBe(true);
    if (data.length > 0) {
      expect(data[0]).toHaveProperty("eventType");
    }
  }, 30000);

  it("should return subsidiaries", async () => {
    const data = await company.subsidiaries();
    expect(Array.isArray(data)).toBe(true);
  }, 30000);
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest __tests__/company.test.ts --no-cache`
Expected: FAIL — `insiderDeals` not found (was `insider_deals`)

**Step 3: Refactor company.ts**

Replace `src/core/stock/company.ts`:

```typescript
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

    const query = `query TickerPriceInfo($ticker: String!, $lang: String) {
      AnalysisReportFiles(ticker: $ticker) { date description link name }
      News(ticker: $ticker) { id organCode ticker newsTitle newsSubTitle newsImageUrl createdAt publicDate newsShortContent newsFullContent closePrice referencePrice floorPrice ceilingPrice percentPriceChange }
      TickerPriceInfo(ticker: $ticker) { financialRatio { yearReport lengthReport updateDate revenue revenueGrowth netProfit netProfitGrowth roe roic roa pe pb eps currentRatio cashRatio quickRatio interestCoverage ae fae netProfitMargin grossMargin ev issueShare ps pcf bvps evPerEbitda at fat acp dso dpo ccc de le ebitda ebit netProfitGrowth dividend RTQ4 charterCapital RTQ10 RTQ17 charterCapitalRatio epsTTM } ticker exchange ceilingPrice floorPrice referencePrice openPrice matchPrice closePrice priceChange percentPriceChange highestPrice lowestPrice totalVolume highestPrice1Year lowestPrice1Year percentLowestPriceChange1Year percentHighestPriceChange1Year foreignTotalVolume foreignTotalRoom averageMatchVolume2Week foreignHoldingRoom currentHoldingRatio maxHoldingRatio }
      Subsidiary(ticker: $ticker) { id organCode subOrganCode percentage subOrListingInfo { enOrganName organName } }
      Affiliate(ticker: $ticker) { id organCode subOrganCode percentage subOrListingInfo { enOrganName organName } }
      CompanyListingInfo(ticker: $ticker) { id issueShare en_History history en_CompanyProfile companyProfile icbName3 enIcbName3 icbName2 enIcbName2 icbName4 enIcbName4 financialRatio { id ticker issueShare charterCapital } }
      OrganizationManagers(ticker: $ticker, lang: $lang) { id ticker fullName positionName positionShortName en_PositionName en_PositionShortName updateDate percentage quantity }
      OrganizationShareHolders(ticker: $ticker) { id ticker ownerFullName en_OwnerFullName quantity percentage updateDate }
      OrganizationResignedManagers(ticker: $ticker, lang: $lang) { id ticker fullName positionName positionShortName en_PositionName en_PositionShortName updateDate percentage quantity }
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
```

**Step 4: Run test to verify it passes**

Run: `npx jest __tests__/company.test.ts --no-cache`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/core/stock/company.ts __tests__/company.test.ts
git commit -m "refactor: company module uses pipeline with normalized output"
```

---

## Task 9: Refactor Listing Module

**Files:**
- Modify: `src/core/stock/listing.ts`
- Test: `__tests__/listing.test.ts`

**Step 1: Update the test**

Replace `__tests__/listing.test.ts`:

```typescript
import vnstock from "../src";

describe("Listing", () => {
  it("should return all symbols", async () => {
    const data = await vnstock.stock.listing.allSymbols();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty("symbol");
    expect(data[0]).toHaveProperty("companyName");
  }, 30000);

  it("should return symbols by exchange", async () => {
    const data = await vnstock.stock.listing.symbolsByExchange();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty("symbol");
    expect(data[0]).toHaveProperty("exchange");
    expect(data[0]).toHaveProperty("companyName");
    expect(data[0]).not.toHaveProperty("board");
    expect(data[0]).not.toHaveProperty("organName");
  }, 30000);

  it("should return symbols by industries", async () => {
    const data = await vnstock.stock.listing.symbolsByIndustries();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty("symbol");
    expect(data[0]).toHaveProperty("industry");
    expect(data[0]).toHaveProperty("industryEn");
    expect(data[0]).not.toHaveProperty("ticker");
    expect(data[0]).not.toHaveProperty("icbName3");
  }, 30000);

  it("should return ICB industries", async () => {
    const data = await vnstock.stock.listing.industriesIcb();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty("code");
    expect(data[0]).toHaveProperty("name");
    expect(data[0]).toHaveProperty("nameEn");
    expect(data[0]).not.toHaveProperty("icbCode");
    expect(data[0]).not.toHaveProperty("icbName");
  }, 30000);

  it("should return symbols by group VN30", async () => {
    const data = await vnstock.stock.listing.symbolsByGroup("VN30");
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty("symbol");
    expect(data[0]).toHaveProperty("exchange");
  }, 30000);
});
```

**Step 2: Refactor listing.ts**

Replace `src/core/stock/listing.ts`:

```typescript
import { fetchWithRetry } from "../../pipeline/fetch";
import { applyTransform } from "../../pipeline/transform";
import {
  symbolTransformConfig,
  tickerInfoTransformConfig,
  icbTransformConfig,
} from "../../pipeline/transform/configs/listing";
import { ListedSymbol, IndustryInfo, IndustryClassification } from "../../models/normalized";
import { BASE_URL, ALL_SYMBOLS_URL, GRAPHQL_URL, GROUP_CODE } from "../../shared/constants";

export class Listing {
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
```

**Step 3: Run test**

Run: `npx jest __tests__/listing.test.ts --no-cache`
Expected: ALL PASS

**Step 4: Commit**

```bash
git add src/core/stock/listing.ts __tests__/listing.test.ts
git commit -m "refactor: listing module uses pipeline with normalized output"
```

---

## Task 10: Refactor Financial Module

**Files:**
- Modify: `src/core/stock/financial.ts`
- Test: `__tests__/financial.test.ts`

**Step 1: Update the test**

Replace `__tests__/financial.test.ts`:

```typescript
import vnstock from "../src";

describe("Financial", () => {
  it("should return normalized balance sheet", async () => {
    const data = await vnstock.stock.financials.balanceSheet({
      symbol: "VCI",
      period: "quarter",
    });

    expect(data).toHaveProperty("data");
    expect(data).toHaveProperty("mapping");
    expect(data.data).toHaveProperty("symbol");
    expect(data.data).not.toHaveProperty("ticker");
  }, 30000);

  it("should return normalized income statement", async () => {
    const data = await vnstock.stock.financials.incomeStatement({
      symbol: "VCI",
      period: "year",
    });

    expect(data).toHaveProperty("data");
    expect(data.data).toHaveProperty("symbol");
  }, 30000);

  it("should return normalized cash flow", async () => {
    const data = await vnstock.stock.financials.cashFlow({
      symbol: "VCI",
    });

    expect(data).toHaveProperty("data");
    expect(data.data).toHaveProperty("symbol");
  }, 30000);
});
```

**Step 2: Refactor financial.ts**

Replace `src/core/stock/financial.ts`:

```typescript
import { fetchWithRetry } from "../../pipeline/fetch";
import { applyTransform } from "../../pipeline/transform";
import { financialTransformConfig } from "../../pipeline/transform/configs/financial";
import { GRAPHQL_URL, PERIOD_MAP, REPORT_NAME, SUPPORTED_LANGUAGES } from "../../shared/constants";

interface FinancialResult {
  data: Record<string, unknown>;
  mapping: {
    ratio: any;
    unit: any;
  };
}

export class Financials {
  async balanceSheet(options: {
    symbol: string;
    period?: string;
    lang?: string;
  }): Promise<FinancialResult> {
    return this.processReport({ ...options, reportKey: REPORT_NAME[0] });
  }

  async incomeStatement(options: {
    symbol: string;
    period?: string;
    lang?: string;
  }): Promise<FinancialResult> {
    return this.processReport({ ...options, reportKey: REPORT_NAME[2] });
  }

  async cashFlow(options: {
    symbol: string;
    period?: string;
    lang?: string;
  }): Promise<FinancialResult> {
    return this.processReport({ ...options, reportKey: REPORT_NAME[1] });
  }

  private async processReport(options: {
    symbol: string;
    period?: string;
    lang?: string;
    reportKey: string;
  }): Promise<FinancialResult> {
    const { symbol, period = "quarter", lang = "en", reportKey } = options;
    this.validate(reportKey, period, lang);

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

  private validate(reportKey: string, period: string, lang: string): void {
    if (!REPORT_NAME.includes(reportKey)) {
      throw new Error(`Invalid report key: ${reportKey}`);
    }
    if (!PERIOD_MAP[period as keyof typeof PERIOD_MAP]) {
      throw new Error(`Invalid period: ${period}. Use "quarter" or "year"`);
    }
    if (!SUPPORTED_LANGUAGES.includes(lang)) {
      throw new Error(`Invalid language: ${lang}. Use "vi" or "en"`);
    }
  }
}
```

**Step 3: Run test**

Run: `npx jest __tests__/financial.test.ts --no-cache`
Expected: ALL PASS

**Step 4: Commit**

```bash
git add src/core/stock/financial.ts __tests__/financial.test.ts
git commit -m "refactor: financial module uses pipeline with normalized output"
```

---

## Task 11: Refactor Commodity Module

**Files:**
- Modify: `src/core/commodity/gold.ts`
- Modify: `src/core/commodity/exchange.ts`
- Modify: `src/core/commodity/index.ts`
- Test: `__tests__/commodity.test.ts`

**Step 1: Update the test**

Replace `__tests__/commodity.test.ts`:

```typescript
import vnstock from "../src";

describe("Commodity", () => {
  it("should return normalized BTMC gold prices", async () => {
    const data = await vnstock.commodity.goldPriceBTMC();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty("name");
    expect(data[0]).toHaveProperty("buyPrice");
    expect(data[0]).toHaveProperty("sellPrice");
    expect(data[0]).toHaveProperty("karat");
    expect(data[0]).not.toHaveProperty("kara");
    expect(data[0]).not.toHaveProperty("buy");
  }, 30000);

  it("should return GiaVangNet gold prices", async () => {
    const data = await vnstock.commodity.goldPriceGiaVangNet();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  }, 30000);

  it("should return normalized SJC gold prices", async () => {
    const data = await vnstock.commodity.goldPriceSJC();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty("type");
    expect(data[0]).toHaveProperty("buyPrice");
    expect(data[0]).toHaveProperty("sellPrice");
    expect(data[0]).not.toHaveProperty("TypeName");
    expect(data[0]).not.toHaveProperty("BuyValue");
  }, 30000);

  it("should return normalized exchange rates", async () => {
    const data = await vnstock.commodity.exchangeRates();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty("currencyCode");
    expect(data[0]).toHaveProperty("currencyName");
    expect(data[0]).toHaveProperty("buyCash");
    expect(data[0]).toHaveProperty("sell");
    expect(data[0]).not.toHaveProperty("CurrencyCode");
    expect(data[0]).not.toHaveProperty("Buy Cash");
  }, 30000);
});
```

**Step 2: Refactor gold.ts**

Replace `src/core/commodity/gold.ts`:

```typescript
import { fetchWithRetry } from "../../pipeline/fetch";
import { applyTransform } from "../../pipeline/transform";
import { goldBtmcTransformConfig, goldSjcTransformConfig } from "../../pipeline/transform/configs/commodity";
import { GoldPriceBtmc, GoldPriceSjc } from "../../models/normalized";

export class GoldService {
  async goldPriceBTMC(): Promise<GoldPriceBtmc[]> {
    const rawData = await fetchWithRetry<any>({
      url: "http://api.btmc.vn/api/BTMCAPI/getpricebtmc?key=3kd8ub1llcg9t45hnoh8hmn7t5kc2v",
      method: "GET",
    });

    const dataList = rawData?.DataList?.Data || [];
    return dataList.map((item: any, index: number) => {
      const raw = {
        name: item[`@n_${index + 1}`],
        kara: item[`@k_${index + 1}`],
        vol: item[`@h_${index + 1}`],
        buy: item[`@pb_${index + 1}`],
        sell: item[`@ps_${index + 1}`],
        world: item[`@pt_${index + 1}`],
        updatedAt: item[`@d_${index + 1}`],
      };
      return applyTransform(raw, goldBtmcTransformConfig) as unknown as GoldPriceBtmc;
    });
  }

  async goldPriceGiaVangNet(): Promise<any[]> {
    const codes = "XAUUSD,USDX,SJL1L10,DOHNL,DOHCML,BTSJC,PQHNVM,VNGSJC,VIETTINMSJC,VNGN,BT9999NTT,PQHN24NTT,DOJINHTV,SJ9999";
    const rawData = await fetchWithRetry<any[]>({
      url: `https://api2.giavang.net/v1/gold/last-price?codes[]=${codes}`,
      method: "GET",
    });

    return rawData;
  }

  async goldPriceSJC(): Promise<GoldPriceSjc[]> {
    const rawData = await fetchWithRetry<any>({
      url: "https://sjc.com.vn/GoldPrice/Services/PriceService.ashx",
      method: "GET",
    });

    return (rawData || []).map(
      (item: any) => applyTransform(item, goldSjcTransformConfig) as unknown as GoldPriceSjc
    );
  }
}
```

**Step 3: Refactor exchange.ts**

Replace `src/core/commodity/exchange.ts`:

```typescript
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { fetchWithRetry } from "../../pipeline/fetch";
import { applyTransform } from "../../pipeline/transform";
import { exchangeRateTransformConfig } from "../../pipeline/transform/configs/commodity";
import { ExchangeRate } from "../../models/normalized";

export class ExchangeService {
  async exchangeRates(date?: string): Promise<ExchangeRate[]> {
    const targetDate = date || format(new Date(), "yyyy-MM-dd");

    const rawData = await fetchWithRetry<any>({
      url: `https://www.vietcombank.com.vn/api/exchangerates/exportexcel?date=${targetDate}`,
      method: "GET",
    });

    const base64 = rawData?.Data;
    if (!base64) return [];

    const workbook = XLSX.read(base64, { type: "base64" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json<any>(sheet);

    return jsonData.map(
      (row: any) => applyTransform(row, exchangeRateTransformConfig) as unknown as ExchangeRate
    );
  }
}
```

**Step 4: Run test**

Run: `npx jest __tests__/commodity.test.ts --no-cache`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/core/commodity/gold.ts src/core/commodity/exchange.ts __tests__/commodity.test.ts
git commit -m "refactor: commodity module uses pipeline with normalized output"
```

---

## Task 12: Refactor Realtime Module

**Files:**
- Modify: `src/core/realtime.ts`
- Test: `__tests__/realtime.test.ts`

**Step 1: Update the test**

Replace `__tests__/realtime.test.ts`:

```typescript
import { realtime } from "../src/core/realtime";

// Mock ws module
jest.mock("ws", () => {
  return class MockWebSocket {
    onopen: any;
    onmessage: any;
    onerror: any;
    onclose: any;
    readyState = 1;
    send = jest.fn();
    close = jest.fn();
  };
});

describe("Realtime", () => {
  it("should parse data into normalized format", () => {
    const raw = "MAIN|VCI#VCI|25500|1000|25400|900|25300|800||||||||||||||||||||26000|500|26100|600|26200|700||||||||||||||||||||25800|5000|300|1.18||||54000|55000|||||60000|61000||b||1705276800";

    const result = realtime.parseData(raw);

    expect(result).toHaveProperty("exchange");
    expect(result).toHaveProperty("symbol");
    expect(result.symbol).toBe("VCI");
    expect(result).toHaveProperty("bidPrices");
    expect(result).toHaveProperty("askPrices");
    expect(result).toHaveProperty("matched");
    expect(result).toHaveProperty("side");
  });

  it("should connect and return socket", async () => {
    const socket = await realtime.connect();
    expect(socket).toBeDefined();
  });

  it("should subscribe to symbols", async () => {
    const socket = await realtime.connect();
    realtime.subscribe(socket, { symbols: ["VCI"] });
    expect(socket.send).toHaveBeenCalled();
  });
});
```

**Step 2: Refactor realtime.ts**

Replace `src/core/realtime.ts`:

```typescript
import { RealtimeQuote } from "../models/normalized";

const DEFAULT_URL = "wss://iboard-pushstream.ssi.com.vn/realtime";

interface RealtimeOptions {
  url?: string;
  onMessage?: (msg: any) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (err: any) => void;
}

interface SubscribeOptions {
  symbols: string[];
  boardIds?: string[];
  component?: string;
}

function createWebSocket(url: string): any {
  if (typeof window !== "undefined" && window.WebSocket) {
    return new window.WebSocket(url);
  }
  const WS = require("ws");
  return new WS(url);
}

function connect(options: RealtimeOptions = {}): any {
  const { url = DEFAULT_URL, onMessage, onOpen, onClose, onError } = options;
  const socket = createWebSocket(url);

  if (onOpen) socket.onopen = onOpen;
  if (onMessage) socket.onmessage = (msg: any) => onMessage(msg.data || msg);
  if (onError) socket.onerror = onError;
  if (onClose) socket.onclose = onClose;

  return socket;
}

function subscribe(socket: any, options: SubscribeOptions): void {
  const { symbols, boardIds = ["MAIN"], component = "priceTableEquities" } = options;

  if (socket.readyState !== 1) {
    throw new Error("WebSocket is not open");
  }

  socket.send(
    JSON.stringify({
      type: "sub",
      topic: "stockRealtimeBySymbolsAndBoards",
      variables: { symbols, boardIds },
      component,
    })
  );
}

function parseData(str: string): RealtimeQuote {
  const parts = str.split("|");

  return {
    exchange: parts[0] || "",
    symbol: (parts[1] || "").split("#")[1] || "",
    bidPrices: [
      { price: Number(parts[2]) / 1000, volume: Number(parts[3]) },
      { price: Number(parts[4]) / 1000, volume: Number(parts[5]) },
      { price: Number(parts[6]) / 1000, volume: Number(parts[7]) },
    ],
    askPrices: [
      { price: Number(parts[24]) / 1000, volume: Number(parts[25]) },
      { price: Number(parts[26]) / 1000, volume: Number(parts[27]) },
      { price: Number(parts[28]) / 1000, volume: Number(parts[29]) },
    ],
    matched: {
      price: Number(parts[48]) / 1000,
      volume: Number(parts[49]),
      change: Number(parts[50]) / 1000,
      changePercent: Number(parts[51]) / 100,
    },
    totalBuyVolume: Number(parts[54]) || 0,
    totalBuyValue: Number(parts[55]) || 0,
    totalVolume: Number(parts[60]) || 0,
    totalValue: Number(parts[61]) || 0,
    side: parts[63] === "b" ? "buy" : "sell",
    lastUpdated: Number(parts[65]) || 0,
  };
}

export const realtime = { connect, subscribe, parseData };
```

**Step 3: Run test**

Run: `npx jest __tests__/realtime.test.ts --no-cache`
Expected: ALL PASS

**Step 4: Commit**

```bash
git add src/core/realtime.ts __tests__/realtime.test.ts
git commit -m "refactor: realtime module uses normalized output"
```

---

## Task 13: Update Stock Class, Runtime, Simple API & Exports

**Files:**
- Modify: `src/core/stock/index.ts`
- Modify: `src/runtime.ts`
- Modify: `src/simple.ts`
- Modify: `src/index.ts`
- Test: `__tests__/simple.test.ts`

**Step 1: Update Stock class**

Replace `src/core/stock/index.ts`:

```typescript
import { Trading } from "./trading";
import { Quote } from "./quote";
import { Listing } from "./listing";
import { Financials } from "./financial";
import { Company } from "./company";

export class Stock {
  trading: Trading;
  quote: Quote;
  listing: Listing;
  financials: Financials;

  constructor() {
    this.trading = new Trading();
    this.quote = new Quote();
    this.listing = new Listing();
    this.financials = new Financials();
  }

  company(ticker: string): Company {
    return new Company(ticker);
  }
}
```

**Step 2: Update runtime.ts**

Replace `src/runtime.ts`:

```typescript
import { Stock } from "./core/stock";
import { Commodity } from "./core/commodity";
import { realtime } from "./core/realtime";

export class Vnstock {
  stock: Stock;
  commodity: Commodity;
  realtime: typeof realtime;

  constructor() {
    this.stock = new Stock();
    this.commodity = new Commodity();
    this.realtime = realtime;
  }
}
```

**Step 3: Update simple.ts**

Replace `src/simple.ts`:

```typescript
import { Vnstock } from "./runtime";
import { INDEX_SYMBOLS } from "./shared/constants";

export function createStockAPI(vnstock: Vnstock) {
  return {
    quote: (options: { ticker: string; start: string; end?: string }) =>
      vnstock.stock.quote.history({
        symbols: [options.ticker],
        start: options.start,
        end: options.end,
        timeFrame: "1D",
      }),

    index: (options: { index: string; start: string; end?: string }) => {
      if (!INDEX_SYMBOLS.includes(options.index)) {
        throw new Error(`Invalid index: ${options.index}. Valid: ${INDEX_SYMBOLS.join(", ")}`);
      }
      return vnstock.stock.quote.history({
        symbols: [options.index],
        start: options.start,
        end: options.end,
        timeFrame: "1D",
      });
    },

    priceBoard: (options: { ticker: string }) =>
      vnstock.stock.trading.priceBoard([options.ticker]),

    topGainers: () => vnstock.stock.trading.topGainers(),

    topLosers: () => vnstock.stock.trading.topLosers(),

    company: (options: { ticker: string }) =>
      vnstock.stock.company(options.ticker),

    financials: (options: { ticker: string; period?: string }) =>
      vnstock.stock.financials.balanceSheet({
        symbol: options.ticker,
        period: options.period,
      }),

    realtime: vnstock.realtime,
  };
}

export function createCommodityAPI(vnstock: Vnstock) {
  return {
    gold: {
      priceBTMC: () => vnstock.commodity.goldPriceBTMC(),
      priceGiaVangNet: () => vnstock.commodity.goldPriceGiaVangNet(),
      priceSJC: () => vnstock.commodity.goldPriceSJC(),
    },
    exchange: (date?: string) => vnstock.commodity.exchangeRates(date),
  };
}
```

**Step 4: Update index.ts**

Replace `src/index.ts`:

```typescript
import { Vnstock } from "./runtime";
import { realtime } from "./core/realtime";
import { createStockAPI, createCommodityAPI } from "./simple";
import * as NormalizedTypes from "./models/normalized";

const vnstock = new Vnstock();

export const stock = createStockAPI(vnstock);
export const commodity = createCommodityAPI(vnstock);
export const VnstockTypes = NormalizedTypes;
export const VnstockRealtime = realtime;
export { Vnstock };

export default vnstock;
```

**Step 5: Update simple.test.ts**

Replace `__tests__/simple.test.ts`:

```typescript
import { stock, commodity } from "../src";

describe("Simple API", () => {
  describe("stock", () => {
    it("stock.quote returns normalized data", async () => {
      const data = await stock.quote({ ticker: "VCI", start: "2024-01-01", end: "2024-01-31" });
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      expect(data[0]).toHaveProperty("date");
      expect(data[0]).toHaveProperty("close");
      expect(data[0]).not.toHaveProperty("c");
    }, 30000);

    it("stock.index returns normalized data", async () => {
      const data = await stock.index({ index: "VNINDEX", start: "2024-01-01", end: "2024-01-31" });
      expect(Array.isArray(data)).toBe(true);
      expect(data[0]).toHaveProperty("date");
    }, 30000);

    it("stock.priceBoard returns normalized data", async () => {
      const data = await stock.priceBoard({ ticker: "VCI" });
      expect(Array.isArray(data)).toBe(true);
      expect(data[0]).toHaveProperty("symbol");
      expect(data[0]).toHaveProperty("price");
    }, 30000);

    it("stock.topGainers returns normalized data", async () => {
      const data = await stock.topGainers();
      expect(Array.isArray(data)).toBe(true);
      expect(data[0]).toHaveProperty("symbol");
    }, 30000);

    it("stock.company returns Company instance", async () => {
      const company = stock.company({ ticker: "VCI" });
      const profile = await company.profile();
      expect(profile).toHaveProperty("industry");
    }, 30000);

    it("stock.financials returns normalized data", async () => {
      const data = await stock.financials({ ticker: "VCI" });
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("symbol");
    }, 30000);
  });

  describe("commodity", () => {
    it("commodity.gold.priceBTMC returns normalized data", async () => {
      const data = await commodity.gold.priceBTMC();
      expect(Array.isArray(data)).toBe(true);
      expect(data[0]).toHaveProperty("buyPrice");
    }, 30000);

    it("commodity.gold.priceSJC returns normalized data", async () => {
      const data = await commodity.gold.priceSJC();
      expect(Array.isArray(data)).toBe(true);
      expect(data[0]).toHaveProperty("buyPrice");
    }, 30000);

    it("commodity.exchange returns normalized data", async () => {
      const data = await commodity.exchange();
      expect(Array.isArray(data)).toBe(true);
      expect(data[0]).toHaveProperty("currencyCode");
    }, 30000);
  });
});
```

**Step 6: Run all tests**

Run: `npx jest --no-cache`
Expected: ALL PASS

**Step 7: Commit**

```bash
git add src/core/stock/index.ts src/runtime.ts src/simple.ts src/index.ts __tests__/simple.test.ts
git commit -m "refactor: update stock class, runtime, simple API and exports for v1.0"
```

---

## Task 14: Update package.json & Final Verification

**Files:**
- Modify: `package.json`

**Step 1: Update version**

Change version in `package.json` from `"0.5.1"` to `"1.0.0-alpha.1"`.

**Step 2: Build**

Run: `npm run build`
Expected: Compiles without errors

**Step 3: Run full test suite**

Run: `npm test`
Expected: ALL PASS

**Step 4: Commit**

```bash
git add package.json
git commit -m "chore: bump version to 1.0.0-alpha.1"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Pipeline types + transform core | pipeline/types.ts, pipeline/transform.ts |
| 2 | Fetch with retry | pipeline/fetch.ts |
| 3 | Transform configs: quote, trading | pipeline/transform/configs/quote.ts, trading.ts |
| 4 | Transform configs: company, financial, listing, commodity | 5 config files |
| 5 | Normalized TypeScript interfaces | models/normalized.ts |
| 6 | Refactor quote module | core/stock/quote.ts |
| 7 | Refactor trading module | core/stock/trading.ts |
| 8 | Refactor company module | core/stock/company.ts |
| 9 | Refactor listing module | core/stock/listing.ts |
| 10 | Refactor financial module | core/stock/financial.ts |
| 11 | Refactor commodity module | core/commodity/gold.ts, exchange.ts |
| 12 | Refactor realtime module | core/realtime.ts |
| 13 | Update stock class, runtime, simple API, exports | 4 core files |
| 14 | Version bump + final verification | package.json |
