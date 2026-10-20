# Nâng cấp từ v1 lên v2

Bản 2.0.0 làm lại API từ đầu. Không có lớp tương thích: code v1 phải sửa theo bảng dưới. Phần khó nhất là **đơn vị**: v2 trả tiền bằng đồng ở mọi nơi, nên mọi phép tính dựa trên số v1 (nghìn đồng, triệu đồng, tỷ đồng) phải đổi lại. Phần này không thể tự động hoá an toàn, hãy đọc kỹ mục "Đơn vị".

## Khởi tạo

```ts
// v1
import vnstock from 'vnstock-js'
await vnstock.init()

// v2: không cần init(), dữ liệu nền tải ở lần dùng đầu
import { vn, createClient } from 'vnstock-js'
const client = createClient({ proxy: '/api/vnstock' }) // khi chạy trên trình duyệt
```

`init({ ratios: true })` không còn. Danh mục mã, lịch nghỉ và tỷ số quý được tải lười qua `Storage`. Trên Node, `fileStorage()` của `vnstock-js/node` cache chúng ở `~/.vnstock-js`.

## Bảng đối chiếu

| v1 | v2 |
|---|---|
| `stock.quote({ ticker: 'FPT', start })` | `vn.stock('FPT').history({ from: start })` |
| `stock.quote.history({ symbols: ['FPT'], start, timeFrame: '1H' })` | `vn.stock('FPT').history({ from: start, interval: '1h' })` |
| `recentHistory('VCB', 30)` | `(await vn.stock('VCB').history('3mo')).slice(-30)` |
| `stock.priceBoard({ ticker: 'FPT' })`, `stock.trading.priceBoard([...])` | `vn.stock('FPT').price()`, `vn.prices(['FPT', 'VCB'])` |
| `quickQuote('VCB')` | `vn.stock('VCB').price()` |
| `compareSymbols(['VCB', 'TCB'])` | `vn.prices(['VCB', 'TCB'])` |
| `stock.topGainers()`, `stock.topLosers()`, `topMovers()` | `vn.topMovers({ limit: 10 })` trả `{ gainers, losers }` |
| `stock.company({ ticker }).profile()` | `vn.stock('FPT').company()` |
| `company.shareholders()`, `officers()`, `events()`, `dividends()`, `news()` | `vn.stock('FPT').shareholders()`, `.officers()`, `.events()`, `.dividends()`, `.news()` (dùng chung một request với `company()`) |
| `stock.financials({ ticker, period })`, `financials.incomeStatement({ symbol, period })` | `vn.stock('FPT').financials('income', { period: 'quarter' })`; loại `'balance'`, `'income'`, `'cashflow'`, `'ratios'` |
| `stock.screening({ filters, sortBy, order })`, `stock.screening.screen(...)` | `vn.screen({ group: 'VN30', where: { pe: { lt: 15 } }, sort: '-roe', limit: 10 })` |
| `stock.listing.symbolsByGroup('VN30')` | `vn.symbols({ group: 'VN30' })` |
| `stock.listing.industriesIcb()` | `vn.symbols({ industry: '...' })`, ngành có trong `industry`, `industryEn` của từng mã |
| `stock.aiContext('VCB', { asOf })` | `vn.stock('VCB').context({ asOf })` |
| `stock.toAIPrompt('VCB', { lang })` | `vn.stock('VCB').prompt({ lang })` |
| `market.overview({ exchange })` | `vn.market({ exchange })` |
| `market.breadth({ exchange })` | `vn.market.breadth({ exchange })` |
| `market.foreignFlow({ exchange, top })` | `vn.market.foreign({ exchange, top })`; lịch sử: `vn.market.foreign({ range: '1mo' })` |
| `stock.foreignFlow('VCB')` | `vn.stock('VCB').foreign()`; lịch sử: `vn.stock('VCB').foreign('3mo')` |
| `market.aiContext()` | `vn.market.context()` |
| `commodity.gold.priceSJC()`, `commodity.goldPrice({ source })` | `vn.gold({ source: 'auto' })` |
| `commodity.exchange()` | `vn.fx({ date })` |
| `news.byDate()`, `news.bySource('Vietstock')`, `news.search('VCB')` | `vn.news({ date })`, `vn.news({ source: 'Vietstock' })`, `vn.news({ query: 'VCB' })` |
| `realtime.connect(...)`, `realtime.subscribe(socket, { symbols })` | `const stop = vn.watch(['FPT', 'VNM'], (t) => ...)`; `vn.stock('FPT').watch(cb)` |
| `import { sma, rsi, ... } from 'vnstock-js'` | `import { sma, rsi, ... } from 'vnstock-js/indicators'` |
| `watchlist.create/add/list` | Không còn trong SDK. Dùng CLI `vnstock watchlist` hoặc tool MCP `watchlist` (cùng file `~/.vnstock-js/watchlist.json`), hoặc tự lưu qua `Storage` |

Tham số luôn là `symbol`, không còn `ticker`. Mã viết thường cũng được, `HSX` hiểu là `HOSE`. Danh mục mã (`vn.symbols()`, `vn.search()`) cũng trả sàn `HOSE`, không còn `HSX` như dữ liệu VCI.

## Khoảng thời gian và khung nến

- Range: `1d 5d 1mo 3mo 6mo ytd 1y 2y 5y max`. Range kiểu cũ như `6m` báo lỗi kèm gợi ý dùng `6mo`.
- Interval: `1m 5m 15m 30m 1h 1d 1w 1mo`. `timeFrame: '1H'` thành `interval: '1h'`.
- Nến dùng `time` thay cho `date`: `'2026-10-16'` cho nến ngày, `'2026-10-16T09:15:00+07:00'` cho nến trong phiên.
- `from`/`to` thay cho `start`/`end`.

## Đơn vị

| Dữ liệu | v1 | v2 | Đổi số v1 sang v2 |
|---|---|---|---|
| Giá cổ phiếu (nến, bảng giá, trần, sàn, tham chiếu) | nghìn đồng (`125.8`) | đồng (`125800`) | nhân 1.000 |
| `QuoteHistory.value` (giá trị giao dịch của nến) | triệu đồng | đồng | nhân 1.000.000 |
| Thanh khoản thị trường, dòng tiền khối ngoại toàn sàn | tỷ đồng | đồng | nhân 1.000.000.000 |
| Giá trị giao dịch trên bảng giá, vốn hoá | không thống nhất | đồng | đối chiếu từng trường |
| Chỉ số (VNINDEX, VN30) | điểm | điểm | giữ nguyên |
| Thay đổi giá theo phần trăm (`changePct`) | phần trăm | phần trăm (`0.96` là 0,96%) | giữ nguyên |
| Biến động trong `context().performance` (`change1d`, `change7d`, `change30d`, `change90d`) | phân số (`0.05`) | phần trăm (`5`) | nhân 100 |
| Tỷ số (ROE, biên lợi nhuận) | không thống nhất | phân số (`0.15` là 15%) | đối chiếu từng trường |
| Giá vàng | theo nguồn | đồng/lượng | đối chiếu nguồn |

Hai lưu ý:

- **Giá vốn trong danh mục.** `vn.portfolio()` nhận `cost` bằng đồng (`120000`). Nếu bạn đang lưu giá vốn theo nghìn đồng (`120`), phải nhân 1.000 trước khi truyền vào.
- **Nến trong phiên.** `value` của nến 1m, 5m, 15m, 30m, 1h là giá trị giao dịch luỹ kế từ đầu phiên tới nến đó, không phải của riêng nến đó. Nến ngày trở lên vẫn là giá trị của riêng nến.

## Lỗi

Các class lỗi giữ nguyên tên (`InvalidSymbolError`, `InvalidParameterError`, `NetworkError`, `RateLimitError`, `ApiError`, `ParseError`, `DataUnavailableError`) và có thêm `hint` chỉ cách sửa, ví dụ `Did you mean "FPT"?`. `NotInitializedError` bị gỡ vì không còn `init()`.

## Môi trường

- Node 18 trở lên. Không còn axios: mọi request đi qua `fetch` có sẵn.
- Trình duyệt cần proxy vì VCI chặn CORS: xem `vnstock-js/proxy` (`nextHandler`, `workerHandler`, `expressHandler`).
- `vn.watch()` ở chế độ stream cần WebSocket: Node 22 trở lên có sẵn, Node 18 đến 21 cài thêm `ws`, hoặc dùng `{ mode: 'poll' }`.

## Tính năng mới không có ở v1

`vn.portfolio()`, lịch sử khối ngoại, `watch()`, `alert()`, `vn.market.intraday()`, `backtest()`, `similar()`, `patterns()`, `vn.index('VNINDEX').health()`. Xem README.
