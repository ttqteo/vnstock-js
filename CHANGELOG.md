# Changelog

## v1.3.0

### Breaking

- **`await init()` is now required** before using symbol lookup or calendar APIs. Symbol and holiday data is no longer bundled — it's fetched at runtime from raw GitHub for freshness.

  **Migration:**
  ```typescript
  import { init } from "vnstock-js";

  await init();   // add this once at app startup
  // ... now safe to use market.calendar / stock APIs that depend on symbols/holidays
  ```

  `init()` accepts options: `symbolsUrl`, `holidaysUrl`, `ttl`, `force`, `cacheDir`, `noCache`, `timeout`. See README for details.

### Tính năng mới

- Remote data module: symbols and holidays now fetched from `raw.githubusercontent.com/ttqteo/vnstock-js/master/data/*.json`
- Disk cache at `~/.vnstock-js/cache/` with 24h default TTL
- Offline fallback: if fetch fails, stale cache is used
- `NotInitializedError` and `DataUnavailableError` error types

### Thay đổi

- `data/*.json` is no longer bundled in the npm package (fetched at runtime instead)

### Realtime hardening

**Sửa:**
- `unsubscribe()` giờ thực sự gửi unsub message cho server (trước đây chỉ xóa local, server vẫn stream).
- Message routing phân biệt quote / JSON control / plain text, không còn nuốt ack message từ server.
- Loại bỏ WebSocket `ping()` vô nghĩa. Browser environment không còn bị reset connection oan mỗi ~40s.
- Thay heartbeat bằng **dead-man's switch**: reconnect nếu không nhận bất kỳ message nào trong `deadManTimeout` (mặc định 60s).

**Breaking (minor):**
- `RealtimeClientOptions.heartbeatInterval` và `heartbeatTimeout` bị loại.
- Thay bằng `deadManTimeout?: number` (ms, mặc định 60000).

### CLI tool (mới)

Tệp người dùng mới: **terminal users**. Cài: `npm i -g vnstock-js` hoặc `npx vnstock-js <command>`.

**Commands:**
- `vnstock quote <SYMBOL>` — snapshot 1 mã (giá, % change, volume, trần/sàn)
- `vnstock history <SYMBOL> [--from 7d|1w|1m|1y] [--range 7d] [--limit N]` — lịch sử OHLCV
- `vnstock search <QUERY>` — tìm mã theo tên/ticker
- `vnstock symbols [--exchange HOSE|HNX|UPCOM]` — liệt kê mã

**Flags chung:**
- `--json`, `--csv` — output format
- `--no-color` — tắt ANSI màu
- `-v, --verbose` — thêm chi tiết
- Non-TTY stdout auto fallback plain text (pipe-friendly)

`quote` và `history` không cần `init()` (truy vấn trực tiếp). `search` và `symbols` tự gọi `init()` lần đầu. Tất cả tính toán date theo múi giờ Việt Nam (UTC+7).

Nếu không set các option này (đa số trường hợp) — không cần làm gì.

## 1.2.0 (2026-04-03)

### Tính năng mới
- **Symbol Directory** -- danh sách ~3300 mã offline với search theo tên/mã/ngành, relevance ranking, VN30 boost
- **Market Calendar** -- `isTradeDay`, `nextTradeDay`, `prevTradeDay`, `holidays`, giờ giao dịch sàn HOSE
- **Rate limit auto-wait** -- gặp HTTP 429 tự động chờ theo `Retry-After` header rồi retry

### API mới
- `stock.search(query, { limit })` -- tìm mã cổ phiếu offline
- `listing.search()`, `listing.getBySymbol()`, `listing.getByExchange()`, `listing.getByIndustry()`, `listing.allLocal()`
- `market.calendar.isTradeDay(date)`, `nextTradeDay(date)`, `prevTradeDay(date)`, `holidays(year)`, `session()`

### Nội bộ
- `fetchWithRetry` hỗ trợ `rateLimitWait` option (mặc định 5s)
- Thêm `SymbolInfo`, `TradingSession` types
- Thêm script `npm run update-symbols`
- Bundle `data/symbols.json` và `data/holidays.json` trong npm package

## 1.1.0 (2026-04-03)

### Tính năng mới
- **Error taxonomy** -- 6 custom error classes: `VnstockError`, `NetworkError`, `RateLimitError`, `ApiError`, `InvalidSymbolError`, `InvalidParameterError`, `ParseError`
- **Realtime v2** -- `RealtimeClient` dùng EventEmitter pattern, auto-reconnect với exponential backoff, heartbeat, subscribe queue
- **Adapter pattern** -- `StockDataAdapter` interface + `VciAdapter`, chuẩn bị cho multi-source sau này
- **FinancialStatement typing** -- thêm 7 optional typed fields (revenue, grossProfit, netIncome, totalAssets, totalEquity, totalDebt, operatingCashFlow)

### Thay đổi breaking
- Realtime API cũ (`VnstockRealtime.connect/subscribe/parseData`) thay bằng `realtime.create()` + `RealtimeClient` event emitter
- `realtime` giờ là top-level export, không còn trên `Vnstock` class hay `stock` object

### Nội bộ
- Pipeline `fetchWithRetry` wrap axios errors thành custom error classes
- Tất cả validation dùng `InvalidParameterError` thay vì `throw new Error`
- Core modules (quote, trading, listing, financial, company) gọi qua adapter thay vì trực tiếp URL

## 1.0.1 (2026-04-02)

- Xóa dependency `xlsx` (2 CVE: Prototype Pollution + ReDoS)
- Chuyển sang VCB JSON API thay vì parse Excel
- Sửa RSI type signature (`period` giờ optional)
- Thêm request timeout 15 giây
- Bổ sung fields thiếu trong `ScreenResult`
- Bỏ duplicate `QuoteHistory` type

## 1.0.0 (2026-04-02)

Breaking changes so với v0.5.x. Refactor toàn bộ kiến trúc.

### Kiến trúc mới
- **Pipeline architecture** -- Request Pipeline (fetch + retry) -> Transform Pipeline (parse, clean, rename, normalize, shape)
- Tất cả output chuẩn hóa: Array of Objects, camelCase, giá chia 1000, ISO dates
- Retry tự động 2 lần với exponential backoff cho lỗi 5xx/timeout
- Request timeout 15 giây

### Tính năng mới
- **Sàng lọc cổ phiếu** (`stock.screening`) -- lọc theo PE, ROE, vốn hóa với batch GraphQL
- **Chỉ báo kỹ thuật** -- SMA, EMA, RSI (pure functions)
- **Company mở rộng** -- affiliates, analysisReports, insiderDeals
- TypeScript interfaces đầy đủ cho tất cả output

### Thay đổi breaking
- Output format thay đổi hoàn toàn (giá chia 1000, field names đổi)
- `stock.price()` -> `stock.quote()`
- `stock.company()` giờ là factory method trả về Company instance
- `VnstockTypes` trỏ sang normalized types
- Realtime `parseData()` trả về `RealtimeQuote` với field names mới

### Sửa lỗi
- Sửa mapping index WebSocket SSI realtime data
- Screening dùng batch GraphQL aliases

---

## 0.5.1

- Sửa lỗi nhỏ

## 0.5.0

- Thêm realtime WebSocket từ SSI
- Đổi `stock.price` -> `stock.quote`
- Thêm `trading.topGainers`, `trading.topLosers`
- Đổi params sang object params

## 0.4.3

- Sửa lỗi Company
- Thêm `stock.quote` (simple API)

## 0.4.2

- Sửa lỗi import alias

## 0.4.1

- Sửa README, đổi export

## 0.4.0

- Thêm giá vàng SJC
- Tái cấu trúc codebase
- Sửa lỗi gọi VCI API

## 0.3.1

- Thêm giá vàng GiaVang.net
- Export model types

## 0.3.0

- Bỏ hỗ trợ TCBS
- Tái cấu trúc

## 0.2.0

- Hỗ trợ VCI: listing (theo sàn, ngành, nhóm), báo cáo tài chính
- Thêm tỷ giá ngoại tệ VCB

## 0.1.0

- Phiên bản đầu tiên
- Giá giao dịch, lịch sử giá, danh sách mã từ VCI và TCBS
- Giá vàng Việt Nam
