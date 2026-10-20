# vnstock-js

[![CI](https://github.com/ttqteo/vnstock-js/actions/workflows/ci.yml/badge.svg)](https://github.com/ttqteo/vnstock-js/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/vnstock-js.svg)](https://www.npmjs.com/package/vnstock-js)
[![license](https://img.shields.io/npm/l/vnstock-js.svg)](https://github.com/ttqteo/vnstock-js/blob/master/LICENSE)

Dữ liệu chứng khoán Việt Nam cho JavaScript/TypeScript. Chạy trên Node, Bun, Deno, Cloudflare Workers, Vercel Edge, và trình duyệt qua proxy đóng gói sẵn.

```ts
import { vn } from 'vnstock-js'

const fpt = vn.stock('FPT')
await fpt.price()          // { price: 127000, changePct: 0.95, ... }
await fpt.history('6mo')   // nến ngày, giá tính bằng đồng
await vn.market()          // VN-Index, thanh khoản, độ rộng, khối ngoại
```

Trang demo: sắp có. [Tài liệu](https://vnstock-js-docs.vercel.app/) | [CHANGELOG](CHANGELOG.md) | [npm](https://www.npmjs.com/package/vnstock-js)

## Cài đặt

```bash
npm install vnstock-js
```

Cần Node 18 trở lên (dùng `fetch` có sẵn). Không cần khóa API, không cần gọi hàm khởi tạo: dữ liệu danh mục mã và lịch nghỉ được tải ở lần dùng đầu.

## Quy ước

- **Tiền tính bằng đồng**: giá cổ phiếu, giá trị giao dịch, vốn hóa, dòng tiền khối ngoại, báo cáo tài chính. `127000` là 127.000 đồng.
- **Chỉ số tính bằng điểm**: VN-Index `1705.91`.
- **Phần trăm thay đổi giá là số phần trăm**: `changePct: 0.95` nghĩa là 0,95%.
- **Tỷ số tài chính là phân số**: `roe: 0.15` nghĩa là 15%, nên lọc ROE trên 15% là `{ roe: { gt: 0.15 } }`.
- **Thời gian theo giờ Việt Nam (ICT)**: nến ngày có `time` dạng `2026-10-16`, nến trong phiên dạng `2026-10-16T09:15:00+07:00`.
- **Tham số luôn là `symbol`**, không phân biệt hoa thường. `HSX` được hiểu là `HOSE`.
- **Khoảng thời gian (range)**: `1d 5d 1mo 3mo 6mo ytd 1y 2y 5y max`, hoặc `{ from, to }`.
- **Khung nến (interval)**: `1m 5m 15m 30m 1h 1d 1w 1mo`. Các khung 5m, 15m, 30m, 1w, 1mo được gộp từ nến gốc ngay trong thư viện.
- **Lỗi có gợi ý**: mọi lỗi có `code`, và thường có `hint`, ví dụ gõ `FTP` sẽ nhận `Did you mean "FPT"?`.

## Cổ phiếu

```ts
import { vn } from 'vnstock-js'

const fpt = vn.stock('FPT')        // đồng bộ, chưa gọi mạng
const quote = await fpt.price()    // giá, trần, sàn, tham chiếu, khối lượng, giá trị
const weekly = await fpt.history({ from: '2025-01-01', interval: '1w' })
const profile = await fpt.company()
const holders = await fpt.shareholders()
const dividends = await fpt.dividends()
const income = await fpt.financials('income', { period: 'year' })
const foreign = await fpt.foreign()      // khối ngoại phiên hiện tại
const context = await fpt.context({ asOf: '2026-10-10' })
const prompt = await fpt.prompt({ lang: 'vi' })
const patterns = await fpt.patterns()    // hỗ trợ/kháng cự, mẫu nến, tín hiệu Turtle, breakout

console.log(quote.price, weekly.length, profile.industry, holders.length, dividends.length)
console.log(income.rows.at(-1)?.values, foreign.netValue, context.trend.direction, prompt, patterns.zones)
```

`financials` nhận `'balance' | 'income' | 'cashflow' | 'ratios'`, số liệu giữ nguyên đơn vị đồng như nguồn trả về.

## Thị trường

```ts
import { vn } from 'vnstock-js'

const overview = await vn.market({ exchange: 'HOSE' })   // chỉ số, thanh khoản, độ rộng, khối ngoại
const past = await vn.market({ asOf: '2026-10-10' })     // bối cảnh thị trường của một phiên đã qua
const breadth = await vn.market.breadth({ exchange: 'HNX' })
const flows = await vn.market.foreign({ top: 5 })
const vnindex = await vn.index('VNINDEX').history('1y')  // điểm
const health = await vn.index('VNINDEX').health()        // ngày phân phối, ngày bùng nổ xác nhận
const quotes = await vn.prices({ group: 'VN30' })
const movers = await vn.topMovers({ limit: 5 })

console.log(overview.liquidity.value, past.regime, breadth.advancing, flows.topNetBuy, vnindex.length, health.status, quotes.length, movers.gainers)
```

`health()` chấm sức khỏe thị trường theo phương pháp của William O'Neil: đếm ngày phân phối trong 25 phiên và tìm ngày bùng nổ xác nhận sau một đáy.

### Lịch sử khối ngoại

VCI chỉ cho xem khối ngoại của phiên hiện tại, nên repo tự ghi mỗi ngày sau 15:30 vào `data/foreign`. Truyền khoảng thời gian để lấy lịch sử: mỗi phiên đã ghi một dòng, cũ trước mới sau, tính bằng đồng. Dữ liệu chỉ có từ ngày bắt đầu ghi (năm 2026); phiên trước đó không có trong kết quả.

```ts
import { vn } from 'vnstock-js'

const fpt = await vn.stock('FPT').foreign('3mo')
const hose = await vn.market.foreign({ range: '1mo' })
const all = await vn.market.foreign({ range: { from: '2026-10-01' }, exchange: 'ALL' })

console.log(fpt.reduce((sum, d) => sum + d.netValue, 0), hose.at(-1)?.netValue, all.length)
```

### Thanh khoản trong phiên

`vn.market.intraday()` trả thanh khoản luỹ kế theo từng phút của phiên hiện tại (phiên gần nhất khi thị trường đã đóng), so với phiên trước tại cùng giờ, kèm độ rộng thị trường lúc gọi. Giờ nghỉ trưa không có điểm nào, phiên ATC là một điểm lúc 14:45.

```ts
import { vn } from 'vnstock-js'

const d = await vn.market.intraday({ exchange: 'HOSE' })
console.log(d.liquidity.value, d.liquidity.changePercent, d.breadth.advancing, d.points.length)
```

## Sàng lọc

```ts
import { vn } from 'vnstock-js'

const cheapAndProfitable = await vn.screen({
  group: 'VN30',
  where: { pe: { lt: 15 }, roe: { gt: 0.15 } },
  sort: '-roe',
  limit: 10,
})
console.log(cheapAndProfitable.map((r) => [r.symbol, r.pe, r.roe, r.marketCap]))
```

Cần chỉ định `group` hoặc `exchange`. Điều kiện trên bảng giá và các tỷ số quý (ROE, ROA, biên lợi nhuận...) chạy trước, không tốn request. PE, PB và vốn hóa phải lấy theo từng mã nên chỉ được hỏi cho những mã còn lại sau bước đó.

## Danh mục đầu tư

`cost` là giá vốn mỗi cổ phiếu, tính bằng đồng (`120000`, không phải `120`). Kết quả có từng vị thế, nhóm theo môi giới, theo ngành và tổng. `pnlPct` là phần trăm, `weight` là tỷ trọng trên NAV (phân số). Vị thế không ghi `broker` được gom vào `default`.

```ts
import { vn } from 'vnstock-js'

const summary = await vn.portfolio({
  positions: [
    { symbol: 'FPT', quantity: 100, cost: 120000, broker: 'DNSE' },
    { symbol: 'VCB', quantity: 200, cost: 58000, broker: 'TCBS' },
  ],
  cash: { DNSE: 5000000, TCBS: 2000000 },
})
console.log(summary.totals.nav, summary.totals.pnlPct, summary.byBroker.DNSE.nav, summary.byIndustry)

await vn.portfolio.save({ positions: [{ symbol: 'FPT', quantity: 100, cost: 120000 }] })
const saved = await vn.portfolio.load()
console.log(saved.positions.length)
```

`save()` và `load()` dùng `storage` của client. Với `fileStorage()` của `vnstock-js/node`, danh mục nằm ở `~/.vnstock-js/portfolio.json`; trên trình duyệt có thể tự viết `Storage` trên IndexedDB.

## Theo dõi giá trực tiếp

`watch()` gọi callback mỗi khi có khớp lệnh mới, giá tính bằng đồng, `changePct` là phần trăm. Mọi watcher của một client dùng chung một kết nối WebSocket. Hàm trả về dùng để dừng theo dõi. Mã sai được báo qua `onError`.

```ts
import { vn } from 'vnstock-js'

const stop = vn.watch(['FPT', 'VCB'], (t) => console.log(t.symbol, t.price, t.changePct))
const stopHpg = vn.stock('HPG').watch((t) => console.log(t.price), {
  mode: 'poll',
  interval: 5000,
  onError: (e) => console.error(e.message),
})

setTimeout(() => {
  stop()
  stopHpg()
}, 60000)
```

`mode: 'poll'` hỏi bảng giá mỗi `interval` ms (mặc định 5 giây). Dùng chế độ này trên serverless và trên trình duyệt đi qua proxy, nơi không giữ được WebSocket lâu. Node 18 đến 21 cần cài thêm `ws` để dùng chế độ stream.

### Cảnh báo

`alert()` chạy trên `watch()` và trả hàm dừng. `when: 'breakout'` báo một lần mỗi phiên khi giá khớp vượt đỉnh cao nhất của `lookback` phiên trước (mặc định 20, không tính phiên hôm nay). Truyền hàm thì cảnh báo chạy mỗi khi hàm đổi từ `false` sang `true`. Không có gì được lưu lại: cảnh báo sống cùng tiến trình.

```ts
import { vn } from 'vnstock-js'

const stopBreakout = vn.stock('FPT').alert({ when: 'breakout' }, (e) => console.log(e.time, e.price, e.level))
const stopPrice = vn.stock('HPG').alert({ when: (t) => t.price >= 30000, mode: 'poll' }, (e) => console.log(e.price))

setTimeout(() => {
  stopBreakout()
  stopPrice()
}, 60000)
```

## Backtest và phiên tương tự

`backtest()` đo từng tín hiệu theo kiểu event study trên nến ngày: vào lệnh ở giá mở cửa phiên sau tín hiệu, thoát khi chạm chốt lời `tp`, cắt lỗ `sl` hoặc hết `hold` phiên. `tp`, `sl` và `ret` tính bằng phần trăm (`tp: 7` là +7%). Phiên chạm cả hai mức thì tính cắt lỗ trước. Mỗi mã chỉ một lệnh mở tại một thời điểm, truyền `overlap: true` để đếm mọi tín hiệu. Không tính phí, trượt giá, trần sàn.

Tín hiệu là hàm nhận các nến tới phiên đang xét (không nhìn trước được), trả `true` hoặc một chuỗi làm nhãn nhóm, hoặc tên preset: `breakout` (đóng cửa vượt đỉnh 20 phiên), `oversold_bounce` (RSI 14 cắt lên 30), `ema_cross` (EMA20 cắt lên EMA50).

```ts
import { vn } from 'vnstock-js'

const r = await vn.stock('FPT').backtest('breakout', { tp: 7, sl: 4, hold: 10 })
console.log(r.stats.all.trades, r.stats.all.winRate, r.stats.all.avgRet)

const many = await vn.backtest(['FPT', 'VCB', 'HPG'], (bars) => {
  const last = bars[bars.length - 1]
  const prev = bars[bars.length - 2]
  if (!prev) return false
  return last.close > prev.high ? (last.volume > prev.volume * 2 ? 'vol-x2' : 'vol-normal') : false
}, { tp: 5, sl: 3, hold: 5, range: '5y' })
console.log(many.stats.byTag)
```

`similar()` (thử nghiệm) tìm các phiên trong 5 năm có trạng thái giống phiên gần nhất (RSI, MACD histogram, khối lượng đột biến, độ dốc EMA20, khoảng cách tới đỉnh 52 tuần) và cho biết giá thay đổi bao nhiêu phần trăm sau 5, 20, 60 phiên. Giống nhau về trạng thái không có nghĩa là giống nhau về kết quả.

```ts
import { vn } from 'vnstock-js'

const s = await vn.stock('FPT').similar({ top: 10 })
console.log(s.matches.map((m) => [m.time, m.similarity, m.ret20]), s.summary.ret20)
```

## Danh mục mã, lịch giao dịch, vàng, tỷ giá, tin tức

```ts
import { vn } from 'vnstock-js'

const banks = await vn.search('ngân hàng', { limit: 5 })
const hose = await vn.symbols({ exchange: 'HOSE' })
const open = await vn.calendar.isTradingDay('2026-10-14')
const next = await vn.calendar.next('2026-09-01')
const gold = await vn.gold()           // đồng/lượng, BTMC rồi dự phòng GiaVang.net
const usd = (await vn.fx()).find((r) => r.currencyCode === 'USD')
const news = await vn.news({ date: '2026-10-14', query: 'lãi suất' })

console.log(banks, hose.length, open, next, gold.items[0]?.sell, usd?.sell, news.length)
```

## Chỉ báo kỹ thuật

```ts
import { vn } from 'vnstock-js'
import { sma, rsi, atr, supportResistance, candlePatterns, turtleSignals, extremeZones, breakouts } from 'vnstock-js/indicators'

const bars = await vn.stock('FPT').history('1y')
const sma20 = sma(bars, { period: 20 })
const rsi14 = rsi(bars)
const atr14 = atr(bars, 14)
const zones = supportResistance(bars)
const candles = candlePatterns(bars)
const turtle = turtleSignals(bars)
const extremes = extremeZones(bars)
const spikes = breakouts(bars)

console.log(sma20.at(-1), rsi14.at(-1), atr14.at(-1), zones, candles.at(-1), turtle.at(-1), extremes.at(-1), spikes)
```

`vnstock-js/indicators` không gọi mạng và chạy được trong trình duyệt. Có sẵn SMA, EMA, RSI, MACD, Bollinger, ATR, SuperTrend, Ichimoku, vùng hỗ trợ/kháng cự, vùng quá mua/quá bán, mẫu nến đảo chiều, tín hiệu Turtle, sức khỏe thị trường, z-score khối lượng, breakout và `patternReport` gộp tất cả. Mọi hàm nhận `Bar[]` và trả kết quả theo `time`.

## Dùng trên trình duyệt

VietCap chặn request từ trình duyệt, nên cần một proxy nhỏ trên server của bạn. Với Next.js (App Router), tạo `app/api/vnstock/[...path]/route.ts`:

```ts
import { nextHandler } from 'vnstock-js/proxy'

export const { GET, POST } = nextHandler()
```

Phía client:

```ts
import { createClient } from 'vnstock-js'

const vn = createClient({ proxy: '/api/vnstock' })
const price = await vn.stock('FPT').price()
console.log(price.price)
```

Proxy chỉ chuyển tiếp tới hai host VietCap mà thư viện dùng, theo danh sách đường dẫn cố định. Body lớn hơn 64 KB bị trả 413 (đổi bằng `maxBodyBytes`), và phản hồi luôn kèm `nosniff` cùng CSP `sandbox` để nội dung từ upstream không chạy được như một trang trên domain của bạn. Có sẵn `workerHandler()` cho Cloudflare Workers, Deno, Bun và `expressHandler()` cho Express.

## Tùy chỉnh client

```ts
import { createClient } from 'vnstock-js'
import { fileStorage } from 'vnstock-js/node'

const client = createClient({
  timeout: 10000,
  retries: 2,
  storage: fileStorage(),   // lưu danh mục mã và lịch nghỉ ở ~/.vnstock-js giữa các lần chạy
  preload: true,            // tải sẵn danh mục mã và lịch nghỉ
})
console.log(await client.stock('VCB').price())
```

Mặc định `vn` dùng bộ nhớ trong tiến trình. `memoryStorage()` có sẵn ở `vnstock-js`, `fileStorage()` ở `vnstock-js/node`.

## MCP cho Claude, Cursor, VS Code

```bash
claude mcp add --scope user vnstock npx -y vnstock-js mcp
```

Với Claude Desktop, thêm vào `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "vnstock": { "command": "npx", "args": ["-y", "vnstock-js", "mcp"] }
  }
}
```

Server có 27 công cụ: giá, lịch sử, tìm mã, top tăng giảm, lịch giao dịch, thông tin công ty, cổ tức, sự kiện, báo cáo tài chính, sàng lọc, bối cảnh kỹ thuật cho AI, độ rộng, khối ngoại và lịch sử khối ngoại, bối cảnh thị trường, vàng, tỷ giá, tin tức, watchlist, pattern kỹ thuật, danh mục, backtest theo preset (`breakout`, `oversold_bounce`, `ema_cross`) và phiên tương tự. Dữ liệu trả về tính bằng đồng; phần tóm tắt hiển thị dạng dễ đọc như `125.8k`, `19.2 nghìn tỷ`.

## CLI

```bash
npx vnstock-js FPT                      # giá hiện tại
npx vnstock-js history FPT --range 7d   # lịch sử 7 ngày
npx vnstock-js market                   # tổng quan thị trường
npx vnstock-js foreign --top 5          # khối ngoại
npx vnstock-js search "ngân hàng"
npx vnstock-js symbols --exchange HOSE
npx vnstock-js compare FPT VCB HPG       # so sánh giá
npx vnstock-js gold                      # giá vàng, đồng/lượng
npx vnstock-js patterns FPT              # vùng hỗ trợ/kháng cự, mẫu nến, Turtle
npx vnstock-js screen --group VN30 --where "pe<15,roe>0.15" --sort -roe
npx vnstock-js backtest FPT VCB --preset breakout --tp 7 --sl 4 --hold 10
npx vnstock-js similar FPT --top 5
npx vnstock-js portfolio add FPT 100 120000 --broker DNSE
npx vnstock-js portfolio                 # định giá danh mục đã lưu
npx vnstock-js watchlist add bank VCB TCB
npx vnstock-js watchlist quote bank
```

Thêm `--json` để lấy dữ liệu dạng JSON cho script (`--csv` với các lệnh giá, lịch sử, tìm mã, thị trường, khối ngoại). Danh mục và watchlist lưu ở `~/.vnstock-js`.

## Nâng cấp từ v1

Bản 2.0.0 thay toàn bộ API. Thay đổi chính:

- `import vnstock from 'vnstock-js'` và `await vnstock.init()` thành `import { vn } from 'vnstock-js'`, không cần khởi tạo.
- `vnstock.stock.quote.history({ symbols, start, timeFrame })` thành `vn.stock('FPT').history('6mo')`.
- `vnstock.stock.trading.priceBoard([...])` thành `vn.prices([...])`.
- Giá trả về bằng đồng thay vì nghìn đồng; dòng tiền và thanh khoản bằng đồng thay vì tỷ đồng.
- Nến có `time` thay vì `date`.
- Chỉ báo chuyển sang `vnstock-js/indicators`.
- Sàng lọc dùng `where` và `sort` thay vì `filters`, `sortBy`, `order`.

Bảng đối chiếu từng lời gọi và cách đổi đơn vị nằm trong [MIGRATION.md](MIGRATION.md).

## Nguồn dữ liệu

- **Cổ phiếu, chỉ số, công ty, tài chính, danh mục**: [VietCap](https://trading.vietcap.com.vn).
- **Realtime**: [SSI](https://iboard.ssi.com.vn) WebSocket.
- **Vàng, tỷ giá**: BTMC, GiaVang.net, Vietcombank.
- **Tin tức**: [ttqteo/news-crawler](https://github.com/ttqteo/news-crawler).

Dữ liệu chỉ phục vụ tham khảo, không phải khuyến nghị đầu tư.

## Lấy cảm hứng từ

[thinh-vu/vnstock](https://github.com/thinh-vu/vnstock), thư viện Python cho dữ liệu chứng khoán Việt Nam.

## Đóng góp

```bash
git clone https://github.com/ttqteo/vnstock-js.git
cd vnstock-js
npm install
npm test
```

Đọc [CONTRIBUTING.md](CONTRIBUTING.md) để biết cấu trúc dự án và quy trình gửi PR. Dự án tuân theo [Quy tắc ứng xử](CODE_OF_CONDUCT.md).

## Giấy phép

[Apache 2.0](LICENSE) © ttqteo
