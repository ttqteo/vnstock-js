# vnstock-js v1.0.0 Design Document

## Overview

Refactor vnstock-js from a raw API wrapper (v0.5.x) into a fully normalized Vietnamese stock market library with Pipeline architecture, optimized for web integration.

**Goals:**
- Feature parity with vnstock Python (single source: VietCap)
- Web-first: Array of Objects output, no external dependencies for caching
- Full data normalization (rename fields, price /1000, ISO dates, camelCase)
- Technical indicators and stock screening built-in
- Breaking change: v1.0.0 (clean cut from v0.5.x)

**Non-goals:**
- Multi-source support (TCBS, SSI REST) - VietCap only
- Built-in caching (users use react-query, SWR, etc.)
- CLI tool (roadmap: later)

---

## Architecture: Pipeline

```
User API (Simple + Advanced)
        |
        v
  Request Pipeline
  +-------+-------+
  | Fetch | Retry |    <-- pluggable middleware
  +-------+-------+
        |
        v
  Transform Pipeline
  +-------+-------+-----------+-------+
  | Parse | Clean | Rename    | VN    | Shape |
  |       |       | Fields    | Biz   |       |
  +-------+-------+-----------+-------+-------+
        |
        v
  Array of Objects (typed)
```

### Request Pipeline

Each middleware follows the same signature:

```ts
type Middleware = (
  config: RequestConfig,
  next: () => Promise<RawResponse>
) => Promise<RawResponse>
```

**Middlewares:**
- **Fetch** - Unified HTTP client (axios), handles GET/POST/GraphQL
- **Retry** - 2 retries on timeout/5xx, exponential backoff

No caching middleware - library stays stateless, users apply their own caching strategy.

### Transform Pipeline

Maps to vnstock Python's 7-step processing:

1. **Parse** - JSON.parse, handle edge cases (empty response, malformed data)
2. **Clean** - Remove null/undefined, drop extra fields, handle missing data
3. **Rename** - Map API field names to clear English camelCase names
4. **Normalize (VN Biz)** - Vietnamese market-specific rules:
   - Price fields / 1000 (unit: thousand VND)
   - Volume: keep as integer
   - Timestamps -> ISO date string "2024-01-15"
   - Percentage fields -> decimal (0.15 not 15)
5. **Shape** - Convert to Array of Objects matching TypeScript interfaces

Each module has its own TransformConfig:

```ts
const quoteTransform: TransformConfig = {
  fieldMap: {
    o: "open", h: "high", l: "low", c: "close",
    v: "volume", t: "date"
  },
  priceFields: ["open", "high", "low", "close"],  // / 1000
  dateFields: ["date"],                             // timestamp -> ISO
}
```

**Example - quote.history:**

```ts
// Raw API response
{ o: [25500, 25800], h: [26000, 26200], l: [25000, 25300],
  c: [25800, 26100], v: [1000000, 1200000], t: [1705276800, 1705363200] }

// After Transform Pipeline
[
  { date: "2024-01-15", open: 25.5, high: 26.0, low: 25.0,
    close: 25.8, volume: 1000000 },
  { date: "2024-01-16", open: 25.8, high: 26.2, low: 25.3,
    close: 26.1, volume: 1200000 },
]
```

---

## Modules

### Stock

| Module | Functions | Status |
|--------|-----------|--------|
| quote | `history()` | Refactor (normalize output) |
| trading | `priceBoard()`, `topGainers()`, `topLosers()` | Refactor |
| company | `overview()`, `profile()`, `shareholders()`, `officers()`, `subsidiaries()`, `events()`, `news()`, `dividends()`, `insiderDeals()`, `analysisReports()` | Refactor |
| financial | `balanceSheet()`, `incomeStatement()`, `cashFlow()` | Refactor |
| listing | `allSymbols()`, `symbolsByExchange()`, `symbolsByIndustries()`, `industriesIcb()`, `symbolsByGroup()` | Refactor |
| screening | `screen({ exchange, filters, sortBy, order, limit })` | NEW |
| realtime | `connect()`, `subscribe()`, `parseData()` | Refactor |

### Commodity

| Module | Functions | Status |
|--------|-----------|--------|
| gold | `priceBTMC()`, `priceGiaVangNet()`, `priceSJC()` | Refactor |
| exchange | `exchangeRates()` | Refactor |

### Indicators (NEW)

Pure functions, no side effects. Work with any `{ date, close, ... }[]` array.

| Indicator | Params | Description |
|-----------|--------|-------------|
| SMA | `period` | Simple Moving Average |
| EMA | `period` | Exponential Moving Average |
| RSI | `period` (default 14) | Relative Strength Index |

```ts
import { sma, ema, rsi } from 'vnstock-js/indicators'

const history = await vnstock.stock.quote.history({ symbol: 'VCI', ... })
const sma20 = sma(history, { period: 20, field: 'close' })
// -> [{ date: "2024-01-15", sma: 25.6 }, ...]
```

More indicators (MACD, Bollinger Bands, etc.) can be added later following the same pattern.

### Screening (NEW)

Combines listing data + financial ratios, filters client-side.

```ts
const results = await vnstock.stock.screening({
  exchange: 'HOSE',
  filters: [
    { field: 'pe', operator: '<', value: 15 },
    { field: 'roe', operator: '>', value: 0.15 },
    { field: 'marketCap', operator: '>', value: 1000 },
  ],
  sortBy: 'roe',
  order: 'desc',
  limit: 20
})
```

**Filterable fields:** price, priceChange, percentChange, pe, pb, ps, eps, roe, roa, roic, marketCap, volume, de.

---

## Directory Structure

```
src/
  core/
    stock/
      quote.ts
      trading.ts
      company.ts
      financial.ts
      listing.ts
      screening.ts           <- NEW
    commodity/
      gold.ts
      exchange.ts
    realtime.ts
  indicators/                 <- NEW
    sma.ts
    ema.ts
    rsi.ts
    index.ts
  pipeline/                   <- NEW
    fetch.ts                  # Unified HTTP client
    retry.ts                  # Retry middleware
    transform/
      parse.ts
      clean.ts
      rename.ts
      normalize.ts            # VN biz rules
      shape.ts
      configs/
        quote.ts
        company.ts
        financial.ts
        trading.ts
        listing.ts
        commodity.ts
  models/                     # Updated TypeScript interfaces
  shared/
    constants.ts
    utils.ts
  simple.ts                   # Updated simplified API
  runtime.ts
  index.ts
```

---

## Usage

```ts
// Advanced API
import vnstock from 'vnstock-js'

const history = await vnstock.stock.quote.history({
  symbol: 'VCI',
  start: '2024-01-01',
  timeFrame: '1D'
})

const company = await vnstock.stock.company.profile('VCI')
const financials = await vnstock.stock.financial.balanceSheet({ symbol: 'VCI', period: 'quarter' })

// Simple API
import { stock, commodity } from 'vnstock-js'

const data = await stock.quote({ ticker: 'VCI', start: '2024-01-01' })
const gold = await commodity.gold.priceSJC()

// Indicators
import { sma, rsi } from 'vnstock-js/indicators'

const sma20 = sma(history, { period: 20 })
const rsi14 = rsi(history, { period: 14 })

// Screening
const screened = await vnstock.stock.screening({
  exchange: 'HOSE',
  filters: [{ field: 'pe', operator: '<', value: 15 }],
  sortBy: 'marketCap',
  order: 'desc'
})
```

---

## Implementation Phases

### Phase 1 - Core Refactor (v1.0.0-alpha)
- Build Pipeline architecture (fetch, retry, transform)
- Create transform configs for all existing modules
- Normalize all outputs: rename fields, price /1000, ISO dates, camelCase
- Unified Array of Objects output
- Update TypeScript interfaces
- Update all tests

### Phase 2 - New Features (v1.0.0-beta)
- `indicators/` module: SMA, EMA, RSI
- `screening` module: filter stocks by financial criteria
- Update simple.ts API

### Phase 3 - Polish & Release (v1.0.0)
- Clear error messages in English
- Documentation + migration guide from v0.x
- Integration examples (React, Vue, Next.js)
- Publish to npm

---

## Future Roadmap
- CLI tool (interactive terminal, quick lookup, realtime dashboard)
- More indicators (MACD, Bollinger Bands, Stochastic, etc.)
- More screening criteria
- WebSocket improvements (auto-reconnect, heartbeat)

---

## Data Source

Single source: **VietCap** (trading.vietcap.com.vn)

| Data Type | Protocol | Endpoint |
|-----------|----------|----------|
| Historical Prices | REST | trading.vietcap.com.vn/api/chart |
| Price Board | REST | trading.vietcap.com.vn/api/price |
| Company Data | GraphQL | trading.vietcap.com.vn/data-mt/graphql |
| Financial Data | GraphQL | trading.vietcap.com.vn/data-mt/graphql |
| Listings | REST | ai.vietcap.com.vn/api |
| Real-time | WebSocket | iboard-pushstream.ssi.com.vn (SSI) |
| Gold (BTMC) | REST | api.btmc.vn |
| Gold (SJC) | REST | sjc.com.vn |
| Gold (GiaVang) | REST | api2.giavang.net |
| Exchange Rates | REST + Excel | vietcombank.com.vn |
