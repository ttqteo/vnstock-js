# Changelog

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
