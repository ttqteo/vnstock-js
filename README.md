# vnstock-js

[![CI](https://github.com/ttqteo/vnstock-js/actions/workflows/ci.yml/badge.svg)](https://github.com/ttqteo/vnstock-js/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/vnstock-js.svg)](https://www.npmjs.com/package/vnstock-js)
[![npm downloads](https://img.shields.io/npm/dm/vnstock-js.svg)](https://www.npmjs.com/package/vnstock-js)
[![license](https://img.shields.io/npm/l/vnstock-js.svg)](https://github.com/ttqteo/vnstock-js/blob/master/LICENSE)

Thư viện JavaScript/TypeScript lấy dữ liệu thị trường chứng khoán Việt Nam. Output chuẩn hóa, sẵn sàng cho web.

[Tài liệu](https://vnstock-js-docs.vercel.app/) | [npm](https://www.npmjs.com/package/vnstock-js) | [GitHub](https://github.com/ttqteo/vnstock-js)

## Tính năng

- **Báo giá**: Dữ liệu giá lịch sử OHLCV, nhiều timeframe (1m, 5m, 1H, 1D, 1W, 1M)
- **Giao dịch**: Bảng giá, top tăng/giảm
- **Công ty**: Thông tin, cổ đông, ban lãnh đạo, sự kiện, tin tức, cổ tức
- **Tài chính**: Bảng cân đối, kết quả kinh doanh, lưu chuyển tiền tệ
- **Niêm yết**: Danh sách mã theo sàn, ngành ICB, nhóm (VN30, HNX30...)
- **Sàng lọc**: Lọc cổ phiếu theo PE, ROE, vốn hóa...
- **Thị trường**: Độ rộng (tăng/giảm/trần/sàn), thanh khoản toàn sàn, khối ngoại mua/bán ròng, bối cảnh thị trường cho AI
- **Hàng hóa**: Giá vàng có dự phòng nguồn (`goldPrice()` tự chuyển BTMC → GiaVang.net khi lỗi), tỷ giá VCB
- **Tin tức**: Tổng hợp tin tài chính VN hàng ngày (Vietstock, VnExpress, Tin Nhanh CK, ...)
- **Realtime**: WebSocket dữ liệu giá trực tiếp (SSI)
- **Chỉ báo kỹ thuật**: SMA, EMA, RSI, MACD, Bollinger Bands, ATR, SuperTrend, Ichimoku Cloud
- **AI context**: `aiContext()` trả structured trend/RSI/MACD/S-R/volume cho LLM reasoning
- **MCP server**: `vnstock mcp` cho Claude Desktop / Cursor / VS Code
- **Watchlist**: quản lý danh sách mã yêu thích, persist `~/.vnstock-js/watchlist.json`
- **CLI**: Command-line tool `vnstock` cho terminal users
- **TypeScript**: Đầy đủ type definitions

## Cài đặt

```bash
# Dùng làm thư viện
npm install vnstock-js

# Cài CLI toàn cục
npm install -g vnstock-js

# Hoặc chạy một lần không cần cài
npx vnstock-js quote VCB
```

## CLI

Sau khi cài `-g`, bạn có command `vnstock` trong terminal:

```bash
# Snapshot giá 1 mã
$ vnstock quote VCB
VCB  Ngân hàng Thương mại Cổ phần Ngoại thương Việt Nam · HSX
59.3k  +0.17%  KL 5.55M  Trần/Sàn 63.3k/55.1k

# Lịch sử giá 7 ngày gần nhất
$ vnstock history VCB --range 7d
┌────────────┬───────┬─────────┬────────┐
│ Date       │ Close │ Change  │ Volume │
├────────────┼───────┼─────────┼────────┤
│ 2026-04-14 │ 59.3k │ +0.17%  │ 5.55M  │
│ 2026-04-11 │ 59.2k │ +0.51%  │ 4.10M  │
│ ...        │       │         │        │
└────────────┴───────┴─────────┴────────┘

# Tìm mã theo tên
$ vnstock search "ngân hàng"
┌────────┬──────────────────────────┬──────────┐
│ Symbol │ Name                     │ Exchange │
├────────┼──────────────────────────┼──────────┤
│ VCB    │ Vietcombank              │ HSX      │
│ BID    │ BIDV                     │ HSX      │
│ ...    │                          │          │
└────────┴──────────────────────────┴──────────┘

# Liệt kê mã sàn HOSE (grid compact, default)
$ vnstock symbols --exchange HOSE --limit 20
VCB    VIC    VNM    VHM    FPT    MBB    ACB    HPG    MSN    VRE
VCI    SSI    STB    TCB    CTG    BID    VPB    TPB    SHB    LPB

# Tổng quan thị trường
$ vnstock market
VNINDEX  1748.86  +0.24% · 2026-07-31
Thanh khoản 8.72k tỷ  -56.9%
Độ rộng HOSE ▲ 130  ▼ 180  = 48  (trần 4, sàn 3 / 358 mã)
Khối ngoại -507.1 tỷ  mua 1.04k tỷ · bán 1.55k tỷ

# Khối ngoại: toàn sàn hoặc một mã
$ vnstock foreign --top 3
$ vnstock foreign VCB

# Script-friendly output
$ vnstock quote VCB --json | jq '.price'
59.3

$ vnstock history VCB --range 1m --csv > vcb.csv
```

### Relative date shortcuts (cho `history`)

| Flag | Ý nghĩa |
|---|---|
| `--range 7d` | 7 ngày trước đến hôm nay |
| `--range 1w` | 1 tuần trước |
| `--range 1m` | 1 tháng trước |
| `--range 1y` | 1 năm trước |
| `--from 2025-01-01 --to 2025-06-30` | Khoảng ngày cụ thể |

Tất cả tính theo múi giờ Việt Nam (UTC+7).

### Flags chung

- `--json`, `--csv`: format output (suppress màu + bảng)
- `--no-color`: tắt màu
- `--verbose`: hiện thêm chi tiết (`-v` dành cho `--version`)
- Non-TTY stdout tự động tắt màu + spinner (pipe-friendly)

## Sử dụng nhanh

```ts
import vnstock from 'vnstock-js';

// Bắt buộc: khởi tạo một lần lúc startup trước khi sử dụng symbol lookup hay calendar APIs
await vnstock.init();

const { stock, commodity } = vnstock;

// Dữ liệu giá lịch sử
const history = await stock.quote({ ticker: 'FPT', start: '2024-01-01' });
// [{ date: "2024-01-02", open: 25.5, high: 26.0, low: 25.0, close: 25.8, volume: 1000000 }, ...]

// Bảng giá
const board = await stock.priceBoard({ ticker: 'FPT' });

// Top tăng / giảm
const gainers = await stock.topGainers();
const losers = await stock.topLosers();

// Thông tin công ty
const company = stock.company({ ticker: 'FPT' });
const profile = await company.profile();
const shareholders = await company.shareholders();

// Báo cáo tài chính
const bs = await stock.financials({ ticker: 'FPT', period: 'quarter' });

// Sàng lọc cổ phiếu
const screened = await stock.screening({
  exchange: 'HOSE',
  filters: [
    { field: 'pe', operator: '<', value: 15 },
    { field: 'roe', operator: '>', value: 0.15 },
  ],
  sortBy: 'roe',
  order: 'desc',
  limit: 10,
});

// Giá vàng
const gold = await commodity.gold.priceSJC();

// Tỷ giá
const rates = await commodity.exchange();
```

### `vnstock.init(options?)`

Gọi một lần lúc startup trước khi sử dụng symbol lookup hay calendar APIs. Tải danh sách mã và ngày lễ từ GitHub (lưu cache cục bộ trong `~/.vnstock-js/cache/` trong 24h).

Tùy chọn:
- `symbolsUrl`, `holidaysUrl`: ghi đè URL GitHub mặc định
- `ttl`: thời gian cache tính bằng ms (mặc định 24h)
- `force`: bỏ qua cache và tải lại
- `cacheDir`: ghi đè vị trí cache
- `noCache`: tắt cache trên disk (chỉ dùng bộ nhớ)
- `timeout`: timeout tải dữ liệu tính bằng ms (mặc định 10s)

## Chỉ báo kỹ thuật

```ts
import { sma, ema, rsi, macd, bollinger, atr } from 'vnstock-js';

const history = await stock.quote({ ticker: 'FPT', start: '2024-01-01' });

const sma20 = sma(history, { period: 20 });
const ema12 = ema(history, { period: 12 });
const rsi14 = rsi(history);
const macdData = macd(history);                        // 12/26/9 default
const bb = bollinger(history, { period: 20, stddev: 2 });
const atr14 = atr(history, 14);
```

## AI context (v1.4+)

```ts
import vnstock from 'vnstock-js';

// Structured JSON cho AI reasoning
const ctx = await vnstock.stock.aiContext('VCB');
console.log(ctx.trend);     // { direction: 'bullish', strength: 0.7, rationale: '...' }
console.log(ctx.indicators);// RSI, MACD, SMA, EMA, Bollinger, ATR
console.log(ctx.levels);    // { support: [...], resistance: [...] }

// Plain-text format để dán vào GPT/Gemini bên ngoài
const text = await vnstock.stock.toAIPrompt('VCB', { lang: 'vi' });

// Tính như thể đang đứng ở cuối phiên 20/07, dùng khi viết báo cáo trễ ngày
const past = await vnstock.stock.aiContext('VCB', { asOf: '2026-07-20' });
```

## Thị trường (v1.5+)

```ts
import vnstock from 'vnstock-js';

// Tổng quan một lời gọi: chỉ số, thanh khoản, độ rộng, khối ngoại
const ov = await vnstock.market.overview({ exchange: 'HOSE' });
console.log(ov.index.close);        // 1749.54 (đơn vị điểm)
console.log(ov.liquidity.value);    // 8720.4 (tỷ VND)
console.log(ov.breadth);            // { advancing: 130, declining: 180, ... }
console.log(ov.foreign.netValue);   // -507.1 (tỷ VND)

// Từng phần riêng
const breadth = await vnstock.market.breadth({ exchange: 'ALL' });
const flow = await vnstock.market.foreignFlow({ exchange: 'HOSE', top: 10 });
const one = await vnstock.stock.foreignFlow('VCB');

// Bối cảnh thị trường cho AI reasoning
const ctx = await vnstock.market.aiContext();
console.log(ctx.regime);      // 'trending_down'
console.log(ctx.liquidity);   // { value, avg20, ratio, signal: 'below_average' }
```

Mọi trường tiền ở mức thị trường tính bằng **tỷ VND**, và output mang kèm `unit` để tự mô tả.

**Giới hạn:** nguồn dữ liệu chỉ có khối ngoại của phiên hiện tại, không có lịch sử theo ngày. `market.aiContext({ asOf })` với ngày quá khứ sẽ trả `breadth: null` và `foreign: null`, kèm lý do trong `notes`.

## Hàng hóa

```ts
// Giá vàng có dự phòng nguồn: thử BTMC trước, lỗi thì chuyển GiaVang.net
const gold = await vnstock.commodity.goldPrice();
console.log(gold.source);   // 'btmc' hoặc 'giavangnet'
console.log(gold.data);

// Ép nguồn cụ thể
await vnstock.commodity.goldPrice({ source: 'giavangnet' });
```

## MCP server (v1.4+)

vnstock-js đi kèm MCP (Model Context Protocol) server expose 21 tools cho Claude:

- 8 data tools: `get_quote`, `get_history`, `search_symbols`, `list_symbols`, `top_movers`, `is_trade_day`, `get_trading_calendar`, `get_company_info`
- 3 corporate tools: `get_dividends`, `get_corporate_events`, `get_financials`
- 3 AI tools: `get_ai_context` (structured technical analysis), `to_ai_prompt` (plain-text), `compare_symbols`
- 3 market tools: `get_market_breadth`, `get_foreign_flow`, `get_market_context`
- 2 commodity tools: `get_gold_price`, `get_exchange_rate`
- 2 tools khác: `get_news`, `watchlist`

`get_ai_context`, `to_ai_prompt` và `get_market_context` nhận thêm `as_of` để tính theo một phiên trong quá khứ.

### Claude Desktop

Edit `claude_desktop_config.json`:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

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

Reload Claude Desktop và hỏi: "giá VCB hôm nay", "phân tích kỹ thuật MBB", "so sánh VCB TCB MBB"...

### Claude Code CLI

User-scope (toàn cục, mọi project dùng được):

```bash
claude mcp add --scope user vnstock npx -y vnstock-js mcp
claude mcp list   # verify: "vnstock: ... - ✓ Connected"
```

Project-scope (commit `.mcp.json` chia sẻ team):

```bash
claude mcp add --scope project vnstock npx -y vnstock-js mcp
```

Project-scope MCP cần approve trong session đầu: gõ `/mcp` trong Claude Code → approve `vnstock`.

### Cursor / VS Code

Tương tự config schema, xem docs MCP của từng client.

### Test queries

Sau khi setup xong, gõ trong Claude:

| Query | Tool gọi |
|---|---|
| `giá VCB hôm nay` | `get_quote` |
| `phân tích kỹ thuật VCB` | `get_ai_context` |
| `xuất context VCB sang text` | `to_ai_prompt` |
| `so sánh VCB và TCB` | `compare_symbols` |
| `top tăng giảm hôm nay` | `top_movers` |
| `30/4/2026 có giao dịch không` | `is_trade_day` |
| `tìm mã ngân hàng` | `search_symbols` |
| `FPT 30 phiên qua` | `get_history` |

## Easy-mode helpers (v1.4+)

```ts
import { quickQuote, recentHistory, compareSymbols, topMovers } from 'vnstock-js';

const q = await quickQuote('VCB');           // { symbol, price, change, volume, ... }
const last30 = await recentHistory('VCB', 30);
const cmp = await compareSymbols(['VCB', 'TCB', 'MBB']);
const movers = await topMovers();             // { gainers, losers }
```

## Watchlist (v1.4+)

```ts
import { watchlist } from 'vnstock-js';

await watchlist.create('banks');
await watchlist.add('banks', ['VCB', 'TCB', 'MBB']);
const symbols = await watchlist.list('banks');
// Persist tại ~/.vnstock-js/watchlist.json (Node)
```

## API nâng cao

```ts
import vnstock from 'vnstock-js';

// Dữ liệu theo giờ
const hourly = await vnstock.stock.quote.history({
  symbols: ['FPT'],
  start: '2024-06-01',
  timeFrame: '1H',
});

// Niêm yết
const vn30 = await vnstock.stock.listing.symbolsByGroup('VN30');
const industries = await vnstock.stock.listing.industriesIcb();

// Tài chính chi tiết
const income = await vnstock.stock.financials.incomeStatement({
  symbol: 'FPT',
  period: 'year',
});

// Realtime WebSocket
const socket = vnstock.realtime.connect({
  onMessage: (data) => {
    const parsed = vnstock.realtime.parseData(data);
    console.log(parsed.symbol, parsed.matched.price);
  },
});
vnstock.realtime.subscribe(socket, { symbols: ['FPT', 'VNM'] });

// Tin tức tài chính (theo ngày, source, hoặc keyword)
const today = await vnstock.news.byDate();                  // hôm nay
const vietstock = await vnstock.news.bySource('Vietstock'); // filter source
const vcbNews = await vnstock.news.search('VCB');           // search title+summary
```

## Định dạng output

Tất cả dữ liệu được chuẩn hóa:

- **Array of Objects**: sẵn sàng cho React, Vue, table, chart
- **camelCase**: tên field tiếng Anh nhất quán
- **Giá chia 1000**: đơn vị nghìn VND (25.5 = 25,500 VND)
- **Ngày ISO**: "2024-01-15"
- **Phần trăm dạng decimal**: 0.15 = 15%

## Nguồn dữ liệu

- **Cổ phiếu / Công ty / Tài chính / Niêm yết**: [VietCap](https://trading.vietcap.com.vn) REST API (từ v1.3.3, trước đó dùng GraphQL).
- **Realtime**: [SSI](https://iboard.ssi.com.vn) WebSocket.
- **Vàng / Tỷ giá**: BTMC, SJC, GiaVang.net, Vietcombank.
- **Tin tức**: [ttqteo/news-crawler](https://github.com/ttqteo/news-crawler) daily JSON aggregator.

Không cần xác thực.

## Tài liệu

Chi tiết và ví dụ: [vnstock-js-docs.vercel.app](https://vnstock-js-docs.vercel.app/)

## Lấy cảm hứng từ

[thinh-vu/vnstock](https://github.com/thinh-vu/vnstock), thư viện Python cho dữ liệu chứng khoán Việt Nam.

## Đóng góp

Rất hoan nghênh đóng góp. Bắt đầu nhanh:

```bash
git clone https://github.com/ttqteo/vnstock-js.git
cd vnstock-js
npm install
npm run test:unit
```

Đọc [CONTRIBUTING.md](CONTRIBUTING.md) để biết cấu trúc dự án, quy ước code và quy
trình gửi PR. Dự án tuân theo [Quy tắc ứng xử](CODE_OF_CONDUCT.md).

Chưa biết bắt đầu từ đâu? Xem các issue gắn nhãn
[good first issue](https://github.com/ttqteo/vnstock-js/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22),
hoặc thêm một chỉ báo kỹ thuật mới (CONTRIBUTING.md có sẵn ví dụ đầy đủ).

## Giấy phép

[Apache 2.0](LICENSE) © ttqteo
