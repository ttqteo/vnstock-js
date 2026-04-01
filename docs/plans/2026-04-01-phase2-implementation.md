# Phase 2: Indicators & Screening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add technical indicators (SMA, EMA, RSI) as pure functions and a stock screening module that filters stocks by financial criteria.

**Architecture:** Indicators are standalone pure functions in `src/indicators/` that accept `QuoteHistory[]` and return result arrays. Screening combines listing + company GraphQL data and applies client-side filters. Both integrate into the simple API via `src/simple.ts` and export from `src/index.ts`.

**Tech Stack:** TypeScript, Jest, existing pipeline (fetchWithRetry, GRAPHQL_URL)

---

## Task 1: SMA Indicator

**Files:**
- Create: `src/indicators/sma.ts`
- Test: `__tests__/indicators/sma.test.ts`

**Step 1: Write the failing test**

Create `__tests__/indicators/sma.test.ts`:

```typescript
import { sma } from "../../src/indicators/sma";

describe("sma", () => {
  const data = [
    { date: "2024-01-01", open: 10, high: 11, low: 9, close: 10, volume: 100 },
    { date: "2024-01-02", open: 11, high: 12, low: 10, close: 11, volume: 200 },
    { date: "2024-01-03", open: 12, high: 13, low: 11, close: 12, volume: 300 },
    { date: "2024-01-04", open: 13, high: 14, low: 12, close: 13, volume: 400 },
    { date: "2024-01-05", open: 14, high: 15, low: 13, close: 14, volume: 500 },
  ];

  it("calculates SMA with default field (close)", () => {
    const result = sma(data, { period: 3 });
    expect(result).toHaveLength(5);
    // First 2 values should be null (not enough data)
    expect(result[0].sma).toBeNull();
    expect(result[1].sma).toBeNull();
    // SMA(3) at index 2: (10+11+12)/3 = 11
    expect(result[2].sma).toBeCloseTo(11);
    // SMA(3) at index 3: (11+12+13)/3 = 12
    expect(result[3].sma).toBeCloseTo(12);
    // SMA(3) at index 4: (12+13+14)/3 = 13
    expect(result[4].sma).toBeCloseTo(13);
  });

  it("preserves date from input", () => {
    const result = sma(data, { period: 3 });
    expect(result[0].date).toBe("2024-01-01");
    expect(result[4].date).toBe("2024-01-05");
  });

  it("calculates SMA on custom field", () => {
    const result = sma(data, { period: 2, field: "volume" });
    expect(result[0].sma).toBeNull();
    expect(result[1].sma).toBeCloseTo(150); // (100+200)/2
    expect(result[2].sma).toBeCloseTo(250); // (200+300)/2
  });

  it("returns all nulls when period > data length", () => {
    const result = sma(data, { period: 10 });
    result.forEach((r) => expect(r.sma).toBeNull());
  });

  it("throws on period < 1", () => {
    expect(() => sma(data, { period: 0 })).toThrow();
  });

  it("returns empty array for empty input", () => {
    expect(sma([], { period: 3 })).toEqual([]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest __tests__/indicators/sma.test.ts --no-cache`
Expected: FAIL — cannot find module

**Step 3: Write implementation**

Create `src/indicators/sma.ts`:

```typescript
import { QuoteHistory } from "../models/normalized";

export interface SmaResult {
  date: string;
  sma: number | null;
}

export function sma(
  data: QuoteHistory[],
  options: { period: number; field?: keyof QuoteHistory }
): SmaResult[] {
  const { period, field = "close" } = options;

  if (period < 1) throw new Error("Period must be >= 1");
  if (data.length === 0) return [];

  const results: SmaResult[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      results.push({ date: data[i].date, sma: null });
    } else {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        sum += data[j][field] as number;
      }
      results.push({ date: data[i].date, sma: sum / period });
    }
  }

  return results;
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest __tests__/indicators/sma.test.ts --no-cache`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/indicators/sma.ts __tests__/indicators/sma.test.ts
git commit -m "feat: add SMA indicator"
```

---

## Task 2: EMA Indicator

**Files:**
- Create: `src/indicators/ema.ts`
- Test: `__tests__/indicators/ema.test.ts`

**Step 1: Write the failing test**

Create `__tests__/indicators/ema.test.ts`:

```typescript
import { ema } from "../../src/indicators/ema";

describe("ema", () => {
  const data = [
    { date: "2024-01-01", open: 10, high: 11, low: 9, close: 10, volume: 100 },
    { date: "2024-01-02", open: 11, high: 12, low: 10, close: 11, volume: 200 },
    { date: "2024-01-03", open: 12, high: 13, low: 11, close: 12, volume: 300 },
    { date: "2024-01-04", open: 13, high: 14, low: 12, close: 13, volume: 400 },
    { date: "2024-01-05", open: 14, high: 15, low: 13, close: 14, volume: 500 },
  ];

  it("calculates EMA with period 3", () => {
    const result = ema(data, { period: 3 });
    expect(result).toHaveLength(5);
    // First 2 values should be null
    expect(result[0].ema).toBeNull();
    expect(result[1].ema).toBeNull();
    // EMA starts with SMA at index 2: (10+11+12)/3 = 11
    expect(result[2].ema).toBeCloseTo(11);
    // EMA at index 3: multiplier = 2/(3+1) = 0.5; EMA = 13*0.5 + 11*0.5 = 12
    expect(result[3].ema).toBeCloseTo(12);
    // EMA at index 4: 14*0.5 + 12*0.5 = 13
    expect(result[4].ema).toBeCloseTo(13);
  });

  it("preserves date from input", () => {
    const result = ema(data, { period: 3 });
    expect(result[0].date).toBe("2024-01-01");
  });

  it("throws on period < 1", () => {
    expect(() => ema(data, { period: 0 })).toThrow();
  });

  it("returns empty array for empty input", () => {
    expect(ema([], { period: 3 })).toEqual([]);
  });

  it("returns all nulls when period > data length", () => {
    const result = ema(data, { period: 10 });
    result.forEach((r) => expect(r.ema).toBeNull());
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest __tests__/indicators/ema.test.ts --no-cache`
Expected: FAIL

**Step 3: Write implementation**

Create `src/indicators/ema.ts`:

```typescript
import { QuoteHistory } from "../models/normalized";

export interface EmaResult {
  date: string;
  ema: number | null;
}

export function ema(
  data: QuoteHistory[],
  options: { period: number; field?: keyof QuoteHistory }
): EmaResult[] {
  const { period, field = "close" } = options;

  if (period < 1) throw new Error("Period must be >= 1");
  if (data.length === 0) return [];

  const multiplier = 2 / (period + 1);
  const results: EmaResult[] = [];

  let prevEma: number | null = null;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      results.push({ date: data[i].date, ema: null });
    } else if (i === period - 1) {
      // First EMA = SMA of first `period` values
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[j][field] as number;
      }
      prevEma = sum / period;
      results.push({ date: data[i].date, ema: prevEma });
    } else {
      if (prevEma === null) {
        results.push({ date: data[i].date, ema: null });
      } else {
        const value = data[i][field] as number;
        prevEma = value * multiplier + prevEma * (1 - multiplier);
        results.push({ date: data[i].date, ema: prevEma });
      }
    }
  }

  return results;
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest __tests__/indicators/ema.test.ts --no-cache`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/indicators/ema.ts __tests__/indicators/ema.test.ts
git commit -m "feat: add EMA indicator"
```

---

## Task 3: RSI Indicator

**Files:**
- Create: `src/indicators/rsi.ts`
- Test: `__tests__/indicators/rsi.test.ts`

**Step 1: Write the failing test**

Create `__tests__/indicators/rsi.test.ts`:

```typescript
import { rsi } from "../../src/indicators/rsi";

describe("rsi", () => {
  // Construct data with known gains/losses
  // Prices: 44, 44.34, 44.09, 43.61, 44.33, 44.83, 45.10, 45.42, 45.84, 46.08,
  //         45.89, 46.03, 45.61, 46.28, 46.28, 46.00, 46.03, 46.41, 46.22, 45.64
  const prices = [44,44.34,44.09,43.61,44.33,44.83,45.10,45.42,45.84,46.08,45.89,46.03,45.61,46.28,46.28,46.00,46.03,46.41,46.22,45.64];
  const data = prices.map((p, i) => ({
    date: `2024-01-${String(i + 1).padStart(2, "0")}`,
    open: p,
    high: p + 0.5,
    low: p - 0.5,
    close: p,
    volume: 1000,
  }));

  it("returns correct length", () => {
    const result = rsi(data, { period: 14 });
    expect(result).toHaveLength(data.length);
  });

  it("returns null for first `period` values", () => {
    const result = rsi(data, { period: 14 });
    for (let i = 0; i < 14; i++) {
      expect(result[i].rsi).toBeNull();
    }
  });

  it("calculates RSI between 0 and 100", () => {
    const result = rsi(data, { period: 14 });
    result.forEach((r) => {
      if (r.rsi !== null) {
        expect(r.rsi).toBeGreaterThanOrEqual(0);
        expect(r.rsi).toBeLessThanOrEqual(100);
      }
    });
  });

  it("preserves date from input", () => {
    const result = rsi(data, { period: 14 });
    expect(result[0].date).toBe("2024-01-01");
  });

  it("throws on period < 1", () => {
    expect(() => rsi(data, { period: 0 })).toThrow();
  });

  it("returns empty array for empty input", () => {
    expect(rsi([], { period: 14 })).toEqual([]);
  });

  it("uses default period of 14", () => {
    const result = rsi(data);
    expect(result[13].rsi).toBeNull();
    expect(result[14].rsi).not.toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest __tests__/indicators/rsi.test.ts --no-cache`
Expected: FAIL

**Step 3: Write implementation**

Create `src/indicators/rsi.ts`:

```typescript
import { QuoteHistory } from "../models/normalized";

export interface RsiResult {
  date: string;
  rsi: number | null;
}

export function rsi(
  data: QuoteHistory[],
  options: { period: number; field?: keyof QuoteHistory } = { period: 14 }
): RsiResult[] {
  const { period = 14, field = "close" } = options;

  if (period < 1) throw new Error("Period must be >= 1");
  if (data.length === 0) return [];

  const results: RsiResult[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  // Calculate price changes
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      gains.push(0);
      losses.push(0);
    } else {
      const change = (data[i][field] as number) - (data[i - 1][field] as number);
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
  }

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      results.push({ date: data[i].date, rsi: null });
    } else if (i === period) {
      // First RSI: simple average of first `period` gains/losses
      let sumGain = 0;
      let sumLoss = 0;
      for (let j = 1; j <= period; j++) {
        sumGain += gains[j];
        sumLoss += losses[j];
      }
      avgGain = sumGain / period;
      avgLoss = sumLoss / period;

      if (avgLoss === 0) {
        results.push({ date: data[i].date, rsi: 100 });
      } else {
        const rs = avgGain / avgLoss;
        results.push({ date: data[i].date, rsi: 100 - 100 / (1 + rs) });
      }
    } else {
      // Smoothed RSI
      avgGain = (avgGain * (period - 1) + gains[i]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

      if (avgLoss === 0) {
        results.push({ date: data[i].date, rsi: 100 });
      } else {
        const rs = avgGain / avgLoss;
        results.push({ date: data[i].date, rsi: 100 - 100 / (1 + rs) });
      }
    }
  }

  return results;
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest __tests__/indicators/rsi.test.ts --no-cache`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/indicators/rsi.ts __tests__/indicators/rsi.test.ts
git commit -m "feat: add RSI indicator"
```

---

## Task 4: Indicators Index & Export

**Files:**
- Create: `src/indicators/index.ts`
- Modify: `src/index.ts`
- Modify: `tsconfig.json` (if needed for path resolution)

**Step 1: Create indicators barrel export**

Create `src/indicators/index.ts`:

```typescript
export { sma, type SmaResult } from "./sma";
export { ema, type EmaResult } from "./ema";
export { rsi, type RsiResult } from "./rsi";
```

**Step 2: Add indicators export to main index**

Add to `src/index.ts` after existing exports:

```typescript
export { sma, ema, rsi } from "./indicators";
```

**Step 3: Run all indicator tests**

Run: `npx jest __tests__/indicators/ --no-cache`
Expected: ALL PASS

**Step 4: Run build to verify exports**

Run: `npm run build`
Expected: Compiles without errors

**Step 5: Commit**

```bash
git add src/indicators/index.ts src/index.ts
git commit -m "feat: export indicators from main package"
```

---

## Task 5: Screening Module — Types & Core Filter Logic

**Files:**
- Create: `src/core/stock/screening.ts`
- Create: `src/models/screening.ts`
- Test: `__tests__/screening.test.ts`

**Step 1: Write the failing test**

Create `__tests__/screening.test.ts`:

```typescript
import { applyFilters, ScreenFilter } from "../../src/core/stock/screening";

describe("applyFilters", () => {
  const stocks = [
    { symbol: "FPT", pe: 12, roe: 0.22, marketCap: 95000, price: 120 },
    { symbol: "VNM", pe: 18, roe: 0.30, marketCap: 150000, price: 80 },
    { symbol: "MBB", pe: 8, roe: 0.18, marketCap: 60000, price: 25 },
    { symbol: "TCB", pe: 6, roe: 0.15, marketCap: 80000, price: 30 },
  ];

  it("filters with < operator", () => {
    const filters: ScreenFilter[] = [{ field: "pe", operator: "<", value: 15 }];
    const result = applyFilters(stocks, filters);
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.symbol)).toEqual(["FPT", "MBB", "TCB"]);
  });

  it("filters with > operator", () => {
    const filters: ScreenFilter[] = [{ field: "roe", operator: ">", value: 0.20 }];
    const result = applyFilters(stocks, filters);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.symbol)).toEqual(["FPT", "VNM"]);
  });

  it("filters with multiple criteria (AND)", () => {
    const filters: ScreenFilter[] = [
      { field: "pe", operator: "<", value: 15 },
      { field: "marketCap", operator: ">", value: 70000 },
    ];
    const result = applyFilters(stocks, filters);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.symbol)).toEqual(["FPT", "TCB"]);
  });

  it("filters with = operator", () => {
    const filters: ScreenFilter[] = [{ field: "symbol", operator: "=", value: "FPT" }];
    const result = applyFilters(stocks, filters);
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe("FPT");
  });

  it("filters with >= operator", () => {
    const filters: ScreenFilter[] = [{ field: "pe", operator: ">=", value: 12 }];
    const result = applyFilters(stocks, filters);
    expect(result).toHaveLength(2);
  });

  it("filters with <= operator", () => {
    const filters: ScreenFilter[] = [{ field: "pe", operator: "<=", value: 8 }];
    const result = applyFilters(stocks, filters);
    expect(result).toHaveLength(2);
  });

  it("returns all when no filters", () => {
    const result = applyFilters(stocks, []);
    expect(result).toHaveLength(4);
  });

  it("sorts by field desc", () => {
    const result = applyFilters(stocks, [], { sortBy: "roe", order: "desc" });
    expect(result[0].symbol).toBe("VNM");
    expect(result[3].symbol).toBe("TCB");
  });

  it("sorts by field asc", () => {
    const result = applyFilters(stocks, [], { sortBy: "pe", order: "asc" });
    expect(result[0].symbol).toBe("TCB");
  });

  it("limits results", () => {
    const result = applyFilters(stocks, [], { limit: 2 });
    expect(result).toHaveLength(2);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest __tests__/screening.test.ts --no-cache`
Expected: FAIL

**Step 3: Write screening types**

Create `src/models/screening.ts`:

```typescript
export interface ScreenFilter {
  field: string;
  operator: "<" | ">" | "<=" | ">=" | "=";
  value: number | string;
}

export interface ScreenOptions {
  exchange?: string;
  filters?: ScreenFilter[];
  sortBy?: string;
  order?: "asc" | "desc";
  limit?: number;
}

export interface ScreenResult {
  symbol: string;
  pe: number;
  pb: number;
  eps: number;
  roe: number;
  roa: number;
  marketCap: number;
  price: number;
  priceChange: number;
  volume: number;
  exchange: string;
  companyName: string;
  industry: string;
  [key: string]: unknown;
}
```

**Step 4: Write implementation**

Create `src/core/stock/screening.ts`:

```typescript
import { fetchWithRetry } from "../../pipeline/fetch";
import { GRAPHQL_URL } from "../../shared/constants";
import { ScreenFilter, ScreenOptions, ScreenResult } from "../../models/screening";

export { ScreenFilter };

export function applyFilters<T extends Record<string, unknown>>(
  data: T[],
  filters: ScreenFilter[],
  options: { sortBy?: string; order?: "asc" | "desc"; limit?: number } = {}
): T[] {
  let result = data.filter((item) =>
    filters.every((f) => {
      const val = item[f.field];
      if (val === null || val === undefined) return false;
      switch (f.operator) {
        case "<": return val < f.value;
        case ">": return val > f.value;
        case "<=": return val <= f.value;
        case ">=": return val >= f.value;
        case "=": return val === f.value;
        default: return true;
      }
    })
  );

  if (options.sortBy) {
    const dir = options.order === "asc" ? 1 : -1;
    result.sort((a, b) => {
      const aVal = a[options.sortBy!] as number;
      const bVal = b[options.sortBy!] as number;
      return (aVal - bVal) * dir;
    });
  }

  if (options.limit && options.limit > 0) {
    result = result.slice(0, options.limit);
  }

  return result;
}

export default class Screening {
  async screen(options: ScreenOptions = {}): Promise<ScreenResult[]> {
    const { exchange, filters = [], sortBy, order = "desc", limit } = options;

    // Fetch all tickers with financial ratios via GraphQL
    const query = `query CompaniesListingInfo {
      CompaniesListingInfo {
        ticker organName enOrganName icbName3 enIcbName3 comTypeCode
        financialRatio {
          pe pb eps roe roa marketCap price priceChange volume
          exchange revenue netProfit de
        }
      }
    }`;

    const response = await fetchWithRetry<any>({
      url: GRAPHQL_URL,
      method: "POST",
      data: { query },
    });

    let stocks: ScreenResult[] = (response.data?.CompaniesListingInfo || [])
      .filter((item: any) => item.financialRatio)
      .map((item: any) => {
        const fr = item.financialRatio;
        return {
          symbol: item.ticker,
          companyName: item.organName || "",
          companyNameEn: item.enOrganName || "",
          industry: item.icbName3 || "",
          industryEn: item.enIcbName3 || "",
          exchange: fr.exchange || "",
          pe: fr.pe,
          pb: fr.pb,
          eps: fr.eps,
          roe: fr.roe,
          roa: fr.roa,
          marketCap: fr.marketCap,
          price: fr.price ? fr.price / 1000 : 0,
          priceChange: fr.priceChange ? fr.priceChange / 1000 : 0,
          volume: fr.volume || 0,
          revenue: fr.revenue,
          netProfit: fr.netProfit,
          debtToEquity: fr.de,
        } as ScreenResult;
      });

    // Filter by exchange if specified
    if (exchange) {
      stocks = stocks.filter((s) => s.exchange === exchange);
    }

    return applyFilters(stocks, filters, { sortBy, order, limit });
  }
}
```

**Step 5: Run test to verify it passes**

Run: `npx jest __tests__/screening.test.ts --no-cache`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add src/core/stock/screening.ts src/models/screening.ts __tests__/screening.test.ts
git commit -m "feat: add stock screening with filter, sort, limit"
```

---

## Task 6: Integrate Screening into Stock Class & Simple API

**Files:**
- Modify: `src/core/stock/index.ts`
- Modify: `src/simple.ts`
- Modify: `src/index.ts`
- Modify: `src/models/normalized.ts`

**Step 1: Add screening to Stock class**

Add to `src/core/stock/index.ts`:

```typescript
import Screening from "./screening";
```

Add property and initialization:

```typescript
screening: Screening;
// in constructor:
this.screening = new Screening();
```

**Step 2: Add screening to simple API**

Add to the return object in `createStockAPI` in `src/simple.ts`:

```typescript
screening: (options: {
  exchange?: string;
  filters?: { field: string; operator: string; value: number | string }[];
  sortBy?: string;
  order?: "asc" | "desc";
  limit?: number;
}) => vnstock.stock.screening.screen(options as any),
```

**Step 3: Re-export screening types from index**

Add to `src/index.ts`:

```typescript
export type { ScreenFilter, ScreenOptions, ScreenResult } from "./models/screening";
```

**Step 4: Run build**

Run: `npm run build`
Expected: Compiles without errors

**Step 5: Commit**

```bash
git add src/core/stock/index.ts src/simple.ts src/index.ts
git commit -m "feat: integrate screening into stock class and simple API"
```

---

## Task 7: Version Bump & Full Verification

**Files:**
- Modify: `package.json`

**Step 1: Update version**

Change version in `package.json` from `"1.0.0-alpha.1"` to `"1.0.0-beta.1"`.

**Step 2: Run full test suite**

Run: `npm test`
Expected: ALL PASS

**Step 3: Run build**

Run: `npm run build`
Expected: Compiles without errors

**Step 4: Commit**

```bash
git add package.json
git commit -m "chore: bump version to 1.0.0-beta.1"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | SMA indicator | indicators/sma.ts |
| 2 | EMA indicator | indicators/ema.ts |
| 3 | RSI indicator | indicators/rsi.ts |
| 4 | Indicators index & export | indicators/index.ts, index.ts |
| 5 | Screening core (filter, sort, limit) | core/stock/screening.ts, models/screening.ts |
| 6 | Integrate screening into Stock & simple API | core/stock/index.ts, simple.ts, index.ts |
| 7 | Version bump & verification | package.json |
