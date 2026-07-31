# Changelog

## 1.5.0 Market & Foreign Data

Thêm nhóm API mức thị trường: độ rộng, thanh khoản, khối ngoại, bối cảnh thị trường cho AI. Thêm `asOf` để tính chỉ báo theo phiên quá khứ. Sửa lỗi đơn vị chỉ số và lỗi serialize error.

### Thêm: mức thị trường

- `vnstock.market.breadth({ exchange })`: số mã tăng, giảm, đứng giá, trần, sàn. Sàn nhận `HOSE` (mặc định), `HNX`, `UPCOM`, `ALL`. Mã chưa khớp lệnh không tính vào thống kê.
- `vnstock.market.liquidity({ index, asOf })`: giá trị giao dịch toàn sàn của phiên, kèm phiên trước và % thay đổi.
- `vnstock.market.foreignFlow({ exchange, top })`: tổng mua, bán, ròng của khối ngoại, kèm top mua ròng và bán ròng.
- `vnstock.stock.foreignFlow(symbol)`: khối ngoại của một mã.
- `vnstock.market.overview({ exchange, index })`: gộp chỉ số, thanh khoản, độ rộng, khối ngoại trong một lời gọi.
- `vnstock.market.aiContext({ exchange, asOf })`: regime (`trending_up`, `trending_down`, `sideways`), thanh khoản so với trung bình 20 phiên, độ rộng, khối ngoại.
- `vnstock.market.index(symbol, { asOf })`: lịch sử chỉ số.

Đơn vị tiền ở nhóm này là **tỷ VND**, output kèm trường `unit`. Toàn bộ quy ước: giá cổ phiếu là nghìn VND, chỉ số là điểm, `QuoteHistory.value` là triệu VND, mức thị trường là tỷ VND.

### Thêm: asOf

- `asOf` cho `stock.aiContext()` và `stock.toAIPrompt()`: tính chỉ báo tại cuối phiên chỉ định. Bao gồm chính phiên đó.

Nguồn dữ liệu chỉ có khối ngoại phiên hiện tại, không có lịch sử theo ngày. `market.aiContext({ asOf })` với ngày quá khứ trả `breadth: null` và `foreign: null`, lý do ghi trong `notes`.

### Thêm: MCP và CLI

- 9 MCP tool mới. Nhóm thị trường: `get_market_breadth`, `get_foreign_flow`, `get_market_context`. Lấp các module SDK trước đây chưa lộ ra MCP: `get_news`, `get_financials`, `screen_stocks`, `get_gold_price`, `get_exchange_rate`, `watchlist`. Thêm `as_of` cho `get_ai_context` và `to_ai_prompt`. MCP server nay có 22 tool (trước 13).
- `vnstock market`: tổng quan thị trường. Cờ `--exchange`, `--index`, `--verbose`.
- `vnstock foreign [symbol]`: khối ngoại toàn sàn hoặc một mã. Cờ `--top`.

### Thêm: giá vàng

- `commodity.goldPrice(options?)`: `{ source: "btmc" | "giavangnet" | "auto" }`, mặc định `auto` thử BTMC trước rồi chuyển GiaVangNet nếu lỗi. Trả `{ source, data }`. API đơn giản: `commodity.gold.price()`.
- Kiểu `GoldPriceGiaVang`: `code`, `name`, `buyPrice`, `sellPrice`, `buyChange`, `sellChange`, `updatedAt`.

### Breaking

- **Giá chỉ số không còn chia 1000.** `quote.history()` với `VNINDEX`, `VN30`, `VN100`, `HNXIndex`, `HNX30`, `HNXUpcomIndex` trước trả `1.66901`, nay trả `1669.01` điểm. Ảnh hưởng `stock.index()`, CLI `history VNINDEX`, MCP `get_history`. Nếu code đang nhân 1000 để bù thì bỏ đi. RSI và MACD không đổi vì bất biến theo thang.
- **`goldPriceGiaVangNet()` trả dữ liệu đã chuẩn hoá.** Trước là raw `Promise<any[]>`, nay là `GoldPriceGiaVang[]`. Field đổi tên: `type_code` thành `code`, `type` thành `name`, `buy` thành `buyPrice`, `sell` thành `sellPrice`.
- **`screening.screen()` bắt buộc có phạm vi.** Phải truyền `group` (VN30, HNX30...) hoặc `exchange` (HOSE, HNX, UPCOM), không thì ném `InvalidParameterError`. Chỉ số tài chính lấy theo từng mã nên quét cả 2089 mã một lần là chắc chắn ăn 429. Kết quả cũng bỏ `eps`, `revenue`, `netProfit`; dùng `stock.financials` nếu cần số tuyệt đối. Chi tiết ở mục Sửa bên dưới.

### Sửa

- **Lỗi ném ra không serialize được.** `cause` của lỗi mạng là đối tượng axios nguyên bản, chứa socket có `_httpMessage` trỏ vòng lại. `JSON.stringify(err)` ném `Converting circular structure to JSON`, log qua Sentry hoặc pino hỏng, truyền lỗi qua worker thì sập. Nay `cause` chỉ giữ `message`, `code`, `url`, `method`, `status`, `statusText`.
- **Chỉ số bị chia 1000.** `transformQuoteHistory` chia OHLC cho 1000 không phân biệt loại mã. Đúng cho giá VND, sai cho chỉ số tính bằng điểm. Nay dùng `priceDivisorFor()`, so khớp không phân biệt hoa thường vì `INDEX_SYMBOLS` trộn kiểu viết (`VNINDEX` và `HNXIndex`).
- **`asOf` lệch một ngày.** Biên `end` của endpoint là loại trừ, nên `asOf` ban đầu bỏ mất chính phiên được hỏi. Nay cộng một ngày khi chuyển đổi.
- **CLI nuốt lệnh mới.** Lối tắt `vnstock MBB` dùng danh sách lệnh cứng, nên `vnstock market` bị coi là mã chứng khoán và trả dòng rỗng. Danh sách nay đọc từ commander.
- **`screening` hỏng âm thầm, nay đã chuyển sang REST.** Endpoint GraphQL của VCI mà module này phụ thuộc nay trả HTTP 200 với body rỗng, nên `screen()` trả mảng rỗng và người dùng đọc thành "không mã nào khớp điều kiện". Đã viết lại dùng REST. Đây là module cuối cùng còn phụ thuộc GraphQL.

  **Breaking:** `screen()` nay **bắt buộc** có `group` (VN30, HNX30...) hoặc `exchange` (HOSE, HNX, UPCOM). Chỉ số tài chính phải lấy theo từng mã, nên quét cả 2089 mã trong một lần là cách chắc chắn ăn 429. Không truyền phạm vi thì ném `InvalidParameterError`.

  Bốn tầng giảm tải: phạm vi bắt buộc và thường nhỏ; bảng giá trả một lần cho cả rổ; bộ lọc trên trường bảng giá (`price`, `volume`, `value`, `changePercent`) chạy trước nên chỉ mã sống sót mới cần gọi chỉ số; chỉ số cache 1 giờ, ngắn hơn nhiều so với chu kỳ quý mà chúng thực sự đổi. Số luồng song song mặc định 5, chỉnh bằng `concurrency`.

  Bộ chỉ số nay giàu hơn GraphQL cũ: thêm `ps`, `roic`, `grossMargin`, `currentRatio`, `dividendYield`. Bỏ `eps`, `revenue`, `netProfit` vì nguồn REST không có; dùng `get_financials` nếu cần số tuyệt đối. `marketCap` nay tính bằng tỷ VND.

### Thêm: chỉ số dựng sẵn trên GitHub

- **`init({ ratios: true })`** tải `data/ratios.json` từ GitHub, cache đĩa 24h như `symbols.json` đang làm. Có file này thì screening lọc theo `roe`, `roa`, `roic`, `grossMargin`, `ebitMargin`, `currentRatio`, `quickRatio`, `debtToEquity`, `dividendYield`, `shares` mà **không gọi một request nào**.

  Đo trên VN30: lọc ROE mất 416ms có file, 1413ms không có. Ghép thêm điều kiện PE thì lọc ROE chạy trước nên chỉ 5 mã sống sót phải gọi mạng.

  Mặc định tắt, vì phần lớn người dùng không sàng lọc và đây là thêm một lượt tải. Tải lỗi thì `init()` vẫn chạy bình thường, screening tự quay về gọi theo từng mã.

- File **chỉ chứa số liệu theo quý**. `pe`, `pb`, `ps`, `marketCap` cố ý không có: chúng phái sinh từ giá nên bản dựng sẵn sẽ sai ngay phiên sau. Screening vẫn gọi theo từng mã cho nhóm này.

- File nằm trên GitHub, **không đóng gói vào npm**. Package vẫn 127 kB thay vì phình thêm 396 kB, và cập nhật dữ liệu không cần phát hành version mới. Workflow `update-data.yml` dựng lại hàng tuần bằng `npm run update-ratios`.

  Script từ chối ghi đè nếu số mã lấy được tụt dưới 80% lần trước, để một lần upstream đổi cấu trúc không âm thầm phá file đang tốt.

  **Lưu ý về dữ liệu:** nguồn trả `0` thay vì `null` cho các chỉ số không áp dụng được với ngành đó, ví dụ `currentRatio` và `roic` của ngân hàng. Thư viện giữ nguyên số của nguồn, không tự suy diễn. Nên lọc kiểu `currentRatio < 1` sẽ dính cả nhóm ngân hàng. Cân nhắc lọc kèm `exchange` hoặc ngành.

### Nội bộ

- `.gitattributes` chuẩn hoá xuống dòng về LF. Trước đó `core.autocrlf` trên Windows cảnh báo mỗi lần `git add`, và mỗi nền tảng sinh ra một kiểu xuống dòng khác nhau nên PR dễ mang diff toàn whitespace.
- Thêm CI chạy lint, typecheck, build, unit test trên Node 18, 20, 22 cho mọi PR. Test gọi API thật tách sang lịch chạy riêng. Thêm issue template, PR template, CODE_OF_CONDUCT.
- ESLint và Prettier nay chạy được. Trước có file cấu hình nhưng chưa cài gói. Chỉnh rule cho khớp quy ước dự án (ES5 dùng `var`, `!= null`, `require()` nạp trễ), từ 936 lỗi về 0.
- Sửa `jest.tsconfig.json`: file kế thừa `./tsconfig.base` không tồn tại và dùng key `tsConfig` sai hoa thường nên ts-jest bỏ qua.
- Sửa cổng `INTEGRATION=1`: `jest.mock("axios")` hoist lên đầu file nên block integration cùng file gọi mock rỗng thay vì gọi mạng. Chúng fail trong 3ms và chưa từng chạy thật từ v1.4.1. Đã tách sang `__tests__/integration/`.
- `engines` lên `>=18`, khớp yêu cầu của `@modelcontextprotocol/sdk` và `commander`.
- Commit `package-lock.json`, bỏ `pnpm-lock.yaml`, để `npm ci` chạy được trong CI.
- Test cần IP Việt Nam tách sau cổng `INTEGRATION_VN=1`. BTMC treo hết 15 giây từ IP nước ngoài, SJC trả 403. Chạy đầy đủ bằng `npm run test:integration:vn`. Test đường dự phòng của `goldPrice()` không bị gate.
- Integration chạy tuần tự (`--runInBand`), job giới hạn 15 phút.
- Thêm test: 23 test cho hàm tổng hợp mức thị trường, 13 test cho screening REST (pool giới hạn luồng, quy đổi đơn vị, phạm vi bắt buộc), 22 test cho MCP tool mới, 8 test cho lối tắt CLI, 5 test biên `asOf`, 3 test serialize lỗi, 3 test đơn vị chỉ số.

### Migration notes

- Đang nhân 1000 để bù giá chỉ số: bỏ đi.
- Đang đọc field raw từ `goldPriceGiaVangNet()`: đổi sang `code`/`name`/`buyPrice`/`sellPrice`.
- Đang gọi `screening.screen()` không tham số: thêm `group` hoặc `exchange`. Đọc `eps`, `revenue` hay `netProfit` từ kết quả: chuyển sang `stock.financials`.
- Không dùng chỉ số, GiaVangNet, screening: không cần làm gì.
- Phần mức thị trường đều là API mới, không đụng gì tới code cũ.

## 1.4.3 Giá trị giao dịch theo bar + history batch nhiều mã

Patch thuần additive, không breaking. Bổ sung giá trị giao dịch (turnover) cho từng bar và mở khóa batch nhiều mã trong `quote.history()`.

### Thêm

- **`QuoteHistory.value`**: trường optional mới, ánh xạ từ `accumulatedValue` của VCI. **Đơn vị: TRIỆU VND** (giữ nguyên raw, không scale như giá). Có mặt trên mọi bar khi VCI trả về; tự động xuất hiện trong output MCP `get_history` và CLI `history` vì cùng dùng `QuoteHistory`. Khi VCI không trả `accumulatedValue`, `value` là `undefined`.
- **`QuoteHistory.symbol`**: trường optional mới, mang mã CK của từng bar. Endpoint chart VCI vốn nhận mảng `symbols` và trả về trong **1 request**, nhưng trước đây transform vứt mất `symbol` nên kết quả batch không phân biệt được mã nào. Nay `quote.history({ symbols: ["VCI","FPT",...] })` trả mảng phẳng vẫn demux được theo `symbol` → gọi 1 request cho cả danh sách thay vì N request (giảm tải, tránh 429). Khuyến nghị batch ở mức hợp lý (vài chục mã/call) để tránh payload lớn timeout 15s.

### Nội bộ

- +4 test transform: ánh xạ `accumulatedValue → value` (đúng độ lớn, không scale), `value` undefined khi thiếu field, `symbol` mang theo mỗi bar để demux batch, và `symbol` undefined khi raw không có.

### Migration notes

- Không breaking. `value` và `symbol` đều optional; code cũ không đụng tới chúng vẫn chạy như trước.

## 1.4.2 Dividend MCP Tools + Indicator Export Fix

Patch thuần additive, không breaking. Expose lịch cổ tức/sự kiện doanh nghiệp qua MCP và backfill root export cho indicators v2.

### Thêm

- **MCP tool `get_dividends`**: wrap `company(symbol).dividends()`. Trả lịch sử & lịch chia cổ tức (tiền mặt + cổ phiếu): `eventType`, `ratio`, `value`, `exRightDate` (GDKHQ), `recordDate`. Daily-report pipeline qua MCP nay thấy được lịch cổ tức (vd. ACB) thay vì mù.
- **MCP tool `get_corporate_events`**: wrap `company(symbol).events()`. Trả tất cả sự kiện doanh nghiệp (cổ tức, ĐHCĐ, phát hành, niêm yết, giao dịch nội bộ).
- MCP server nay đăng ký **13 tools** (trước 11). Cả 2 tool bilingual (Vi + En).

### Sửa

- **Root export thiếu `macd` / `bollinger` / `atr`**: 3 indicator v2 đã có trong `src/indicators/index.ts` từ v1.4.0 nhưng `src/index.ts` quên re-export, buộc user import từ `vnstock-js/dist/indicators/*`. Nay export thẳng từ root: `import { macd, bollinger, atr } from "vnstock-js"`. Bổ sung luôn `ichimokuFutureCloud`. Fix này cũng làm đúng ví dụ import trong docs indicators (vốn đã ghi import từ root nhưng trước đó chạy lỗi).

### Nội bộ

- +5 test MCP handler (get_dividends + get_corporate_events). Schema test 11 → 13 tools.

### Migration notes

- Không breaking. Nếu trước đây import `macd`/`bollinger`/`atr` từ subpath `vnstock-js/dist/indicators/*`, vẫn chạy; nay có thể chuyển sang root import.

## 1.4.1 Indicators Expansion + Network Resilience + Stability

Bổ sung 2 indicator mới (SuperTrend + Ichimoku Cloud), gia tăng độ ổn định khi gặp Cloudflare rate-limit, deprecate endpoint SJC bị 403, gate integration tests sau env `INTEGRATION=1`, TTL cache cho VCI static endpoints.

### Thêm

- **`superTrend(candles, opts?)`**: trend-following indicator (default `period=10, multiplier=3`, chuẩn TradingView/pandas_ta). Trả `superTrend`, `direction` (`bullish`/`bearish`), `upperBand`, `lowerBand` cho từng bar. Dùng ATR module có sẵn.
- **`ichimoku(candles, opts?)`**: Ichimoku Cloud (default `tenkan=9, kijun=26, senkou=52, displacement=26`). Convention: `senkouSpanA[i]` / `senkouSpanB[i]` là **giá trị cloud hiện tại tại i** (đã shift forward từ i-26), tiện cho so sánh `close[i]` vs cloud. `chikouSpan[i] = close[i+26]`, null cho 26 bars cuối.
- **`ichimokuFutureCloud(candles, opts?)`**: projection cloud 26 phiên tới (chart use case). Trả `IchimokuFutureBar[]` với `offset` 1..26, `senkouSpanA/B`, `cloudTop/Bottom`. Không include trong `aiContext` (chỉ historical).
- **AI context layer extended**: `vnstock.stock.aiContext(symbol)` và `toAIPrompt(symbol)` nay include:
  - `superTrend: { value, direction }`
  - `ichimoku: { tenkanSen, kijunSen, cloudTop, cloudBottom, priceVsCloud, tkCross }`
  - `formatAIPrompt` output thêm dòng `SuperTrend:` và `Ichimoku:` cho cả `vi` lẫn `en`.
- **`classifyTrend()` ảnh hưởng bởi SuperTrend + Ichimoku**: EMA trend được confirm/contradict bởi 2 indicator mới:
  - Bullish EMA + ST bullish + price above cloud → strength + 0.2
  - Bullish EMA nhưng ST bearish + price below cloud → strength × 0.5
  - Neutral EMA + ST & Ichimoku đồng thuận → upgrade direction (strength=0.4)
- **MCP tool descriptions**: `get_ai_context` và `to_ai_prompt` cập nhật mention SuperTrend + Ichimoku.
- **Root export**: `superTrend`, `ichimoku` exposed ở `src/index.ts` cho user import trực tiếp.
- **`VciAdapter({ cache })` option**: TTL in-memory cache cho 3 endpoints static-ish: `icb-codes` (1h), `search-bar` (30 min), `financial-statement/metrics` per symbol (1h). Default `cache: true`. Opt-out: `new VciAdapter({ cache: false })`. Public method `clearCache()` để invalidate manual.

### Sửa

- **Cloudflare Error 1015 detection** (issue #10): `pipeline/fetch.ts` nay detect Cloudflare rate-limit qua `cf-ray` header + body chứa `Error 1015` hoặc `cloudflare` (cho HTTP 4xx). Throw `RateLimitError` thay vì `ApiError`, retry với exponential backoff 30s → 60s → 120s.
- **`goldPriceSJC()` deprecated** (issue #12): SJC endpoint trả 403 từ non-VN IPs (đã skip test từ v1.3.3). Method giờ log `console.warn` redirect sang `goldPriceBTMC()` / `goldPriceGiaVangNet()`. Giữ method cho backwards compat, sẽ remove ở v2.0.
- **Tests gate `INTEGRATION=1`** (issue #9): `listing.test.ts`, `company.test.ts`, `financial.test.ts` skip real-API blocks mặc định. Chạy full integration: `INTEGRATION=1 npm test`. Default CI nay mock-based, không hit Vietcap → tránh rate-limit/Cloudflare 1015 trong dev loop.

### Nội bộ

- 60+ new tests (12 supertrend + 22 ichimoku + 6 cloudflare-1015 + 5 vci-cache + extends ai-context + mock-based listing/company/financial).
- 45 test suites, 383 pass / 18 skip (skip ~ integration-gated).
- ATR + Bollinger + MACD vẫn dùng subpath import (`vnstock-js/dist/indicators/*`): không backfill root export trong patch này.

### Migration notes

- Không breaking. Existing `aiContext` consumer chỉ thấy thêm 2 field mới trong `indicators` (`superTrend`, `ichimoku`); JSON nay lớn hơn ~200 bytes.
- `goldPriceSJC()` deprecated nhưng vẫn callable; chuyển sang `goldPriceBTMC()` để remove console.warn.
- `VciAdapter` mặc định bật cache. Nếu code cũ phụ thuộc fresh API mỗi call cho `icb-codes`/`search-bar`/`metrics`, pass `{ cache: false }` hoặc gọi `clearCache()`.
- Tests cần real-API verification: chạy `INTEGRATION=1 npm test` thay vì `npm test`.

## 1.4.0 AI-Native Foundation

Repositioning vnstock-js từ "VN stock SDK" sang "AI Research Toolkit cho cổ phiếu Việt Nam". Bundle MCP server + indicators v2 + AI context layer + easy-mode helpers + watchlist trong 1 release.

### Thêm

- **MCP server** (`vnstock mcp` subcommand): stdio MCP server cho Claude Desktop / Cursor / VS Code. 11 tools bilingual (Vi + En):
  - 8 data tools: `get_quote`, `get_history`, `search_symbols`, `list_symbols`, `top_movers`, `is_trade_day`, `get_trading_calendar`, `get_company_info`
  - 3 AI primitives: `get_ai_context`, `to_ai_prompt`, `compare_symbols`
  - Session cache (30s quote, 60s aiContext) giảm pressure VCI
  - Dynamic import → CLI startup không bị regress
- **Indicators v2**: bổ sung SMA/EMA/RSI có sẵn:
  - `macd(candles, opts?)`: 12/26/9 default, configurable fast/slow/signal
  - `bollinger(candles, opts?)`: 20-period 2-stddev, trả thêm `percentB` (0..1)
  - `atr(candles, period?)`: Wilder smoothing, default 14-period
- **AI context layer:**
  - `vnstock.stock.aiContext(symbol)`: structured JSON: trend (bullish/bearish/neutral), indicators snapshot (RSI/MACD/SMA/EMA/Bollinger/ATR), pivot S/R, volume z-score, performance 1d/7d/30d/90d
  - `vnstock.stock.toAIPrompt(symbol, { lang })`: plain-text format cho non-MCP LLM (GPT/Gemini/local)
  - Trend classifier rules-based (EMA chain + slope)
  - S/R bằng swing pivot points (5-day window)
- **Easy-mode helpers** top-level:
  - `vnstock.quickQuote("VCB")`: giá hiện tại + change %
  - `vnstock.recentHistory("VCB", 30)`: N phiên gần nhất
  - `vnstock.compareSymbols(["VCB","TCB"])`: side-by-side
  - `vnstock.topMovers()`: gainers + losers cùng response
- **Watchlist module** `vnstock.watchlist`:
  - CRUD: `create/delete/add/remove/list/listAll/has`
  - Persist Node: `~/.vnstock-js/watchlist.json` (atomic rename)
  - Browser: no-op + warn, inject custom via `setStorage(adapter)`
  - Auto-uppercase, dedup symbols

### Nội bộ

- Dependency mới: `@modelcontextprotocol/sdk@^1.29.0`
- 83 new tests (24 indicators + 16 ai-context + 4 easy-mode + 12 watchlist + 27 mcp)
- Pure-function indicators v2 (không network), AI context layer compose lại, testable mock-based

### Migration notes

Không breaking. v1.3.x code chạy y nguyên. Features mới opt-in.

Cài MCP server vào Claude Desktop:

```json
{
  "mcpServers": {
    "vnstock": {
      "command": "npx",
      "args": ["-y", "vnstock-js", "mcp"]
    }
  }
}
```

## 1.3.3

### Thêm

- **Module `news`**: fetch tin tức tài chính VN từ [news-crawler](https://github.com/ttqteo/news-crawler) (RSS aggregator daily JSON: Vietstock, Markettimes, Người Quan Sát, VnExpress, Tin Nhanh Chứng Khoán).
  - `vnstock.news.byDate(date?)`: date `"YYYY-MM-DD"` hoặc bỏ trống = hôm nay; trả `FinancialNews[]` sort theo `publishedAt` desc
  - `vnstock.news.bySource(source, date?)`: filter substring (case-insensitive)
  - `vnstock.news.search(keyword, date?)`: search trong `title` + `summary`
  - Type `FinancialNews { id, source, title, summary, link, image, publishedAt }`
  - Data fetch trực tiếp từ raw GitHub, không cache local (user tự cache nếu cần)

### Sửa

- **VCI Listing / Company / Financial hoạt động trở lại.** Chuyển 3 module này từ GraphQL (`trading.vietcap.com.vn/data-mt/graphql`, offline từ ~04/2026) sang Vietcap REST mới (`iq.vietcap.com.vn/api/iq-insight-service/...` + `trading.vietcap.com.vn/api/...`). Port theo `vnstock` Python 3.5.2.
  - `listing.symbolsByIndustries()` → `GET /v2/company/search-bar?language=1|2`
  - `listing.industriesIcb()` → `GET /v1/sectors/icb-codes`
  - `company.*` (`profile`, `shareholders`, `officers`, `events`, `news`, `dividends`, `insiderDeals`) → 5 REST calls song song (`/details`, `/{ticker}/shareholder-structure`, `/{ticker}/shareholder`, `/events`, `/news`) thay 1 GraphQL query
  - `financials.balanceSheet|incomeStatement|cashFlow()` → `GET /v1/company/{symbol}/financial-statement?section=BALANCE_SHEET|INCOME_STATEMENT|CASH_FLOW` + `/statistics-financial` (ratios) + `/financial-statement/metrics` (field mapping)
- Public API (`Company`, `Financials`, `Listing`) **không đổi**: adapter re-shape REST response về cùng contract cũ để không breaking core.

### Nội bộ

- `src/shared/session.ts`: sticky `Device-Id` (16 hex per process), random `User-Agent` từ pool 5 browsers, in-memory cookie jar theo domain.
- `VciAdapter.ensureHandshake()`: gọi `GET trading.vietcap.com.vn/priceboard` 1 lần (module-level state, promise dedup) để lấy session cookies trước Vietcap REST calls.
- `pipeline/fetch.ts` chỉ inject Vietcap-specific headers (Origin/Referer/Device-Id/Cookie) cho `*.vietcap.com.vn`; external domains (BTMC, SJC, GiaVangNet, Vietcombank) giữ headers tối thiểu để không bị 403.

### Known issue

- `listing.allSymbols()` vẫn skip vì endpoint `ai.vietcap.com.vn` trả 403.
- `screening` chưa migrate REST, vẫn dùng GraphQL deprecated. Defer sang version sau (không có endpoint REST tương đương trong Python source).
- Một số commodity test (SJC) vẫn fail do upstream 403 (pre-existing, không liên quan v1.3.3).

## 1.3.2

### Thêm

- **CLI tự phát hiện version mới**: mỗi lần chạy `vnstock`, background check `registry.npmjs.org/vnstock-js/latest`, nếu phát hiện bản mới sẽ in banner ở cuối output (stderr). Cache 24h tại `~/.vnstock-js/cache/version-check.json`, timeout 2s, fail silent. Tự skip khi non-TTY, `CI=1`, `NODE_ENV=test`, hoặc `VNSTOCK_NO_UPDATE_CHECK=1`. Không thêm dependency nào.

### Sửa

- **`history --range 1d`** (hoặc window ngắn) giờ tính đúng `Change %` cho phiên cũ nhất trong kết quả. Handler fetch thêm buffer 10 phiên trước `start` để phiên đầu window có reference cho phép so sánh với phiên trước nó. Trước đây phiên cũ nhất luôn hiện `+0.00%` vì không có reference.

### Known issue

- **VCI GraphQL endpoint offline từ ~04/2026** (`trading.vietcap.com.vn/data-mt/graphql` trả body rỗng `{}`). Ảnh hưởng: `company.*`, `financials.*`, `listing.symbolsByIndustries`, `listing.industriesIcb`. Các API khác (`quote`, `priceBoard`, `topGainers/Losers`, `listing.symbolsByExchange`, `commodity`, realtime) vẫn hoạt động bình thường. Kế hoạch: migrate sang KBS data source ở v1.4.

## 1.3.1

Bản vá cho CLI sau khi release 1.3.0.

### Sửa

- **`history --range 7d`** giờ trả đúng ~7 phiên (trước đây trả ~365 phiên do VCI API bỏ qua `start` khi `countBack` mặc định lớn). Handler tự tính `countBack` theo khoảng ngày và filter lại kết quả.
- **Hiển thị giá:** làm tròn tối đa 2 chữ số thập phân, cắt số 0 cuối. Không còn `56.291760000000004k`.
- **`symbols --exchange HOSE`** giờ hoạt động (trước đây trả rỗng vì data lưu `HSX`). `Directory.getByExchange` tự map `HOSE` → `HSX`.
- **`symbols` mặc định trả đầy đủ** (trước đây tự cắt ở 50). `--limit N` chỉ áp dụng khi user chỉ định.
- **`vnstock -v`** cho `--version` (trước đây dùng `-V` hoa mặc định của commander). Version đọc từ `package.json` thay vì hardcode. `--verbose` ở sub-command bỏ alias `-v` để tránh xung đột.

### Thêm

- **Header cho `history` và `symbols`:** ví dụ `VCB  2026-04-07 → 2026-04-14  (5 phiên)` và `HOSE  (702 mã)`.
- **`docs/local-test.md`**: hướng dẫn `npm link`, watch mode, `npm pack`, debug CLI trước khi release.
- **`npm run dev`**: `tsc --watch` để auto rebuild khi sửa code.

## v1.3.0

### Breaking

- **`await init()` is now required** before using symbol lookup or calendar APIs. Symbol and holiday data is no longer bundled, it is fetched at runtime from raw GitHub for freshness.

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
- `vnstock quote <SYMBOL>`: snapshot 1 mã (giá, % change, volume, trần/sàn)
- `vnstock history <SYMBOL> [--from 7d|1w|1m|1y] [--range 7d] [--limit N]`: lịch sử OHLCV
- `vnstock search <QUERY>`: tìm mã theo tên/ticker
- `vnstock symbols [--exchange HOSE|HNX|UPCOM]`: liệt kê mã

**Flags chung:**
- `--json`, `--csv`: output format
- `--no-color`: tắt ANSI màu
- `-v, --verbose`: thêm chi tiết
- Non-TTY stdout auto fallback plain text (pipe-friendly)

`quote` và `history` không cần `init()` (truy vấn trực tiếp). `search` và `symbols` tự gọi `init()` lần đầu. Tất cả tính toán date theo múi giờ Việt Nam (UTC+7).

Nếu không set các option này (đa số trường hợp): không cần làm gì.

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
