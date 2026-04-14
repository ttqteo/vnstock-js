# vnstock-js

[![npm version](https://img.shields.io/npm/v/vnstock-js.svg)](https://www.npmjs.com/package/vnstock-js)
[![license](https://img.shields.io/npm/l/vnstock-js.svg)](https://github.com/ttqteo/vnstock-js/blob/master/LICENSE)

Thư viện JavaScript/TypeScript lấy dữ liệu thị trường chứng khoán Việt Nam. Output chuẩn hóa, sẵn sàng cho web.

[Tài liệu](https://vnstock-js-docs.vercel.app/) | [npm](https://www.npmjs.com/package/vnstock-js) | [GitHub](https://github.com/ttqteo/vnstock-js)

## Tính năng

- **Báo giá** -- Dữ liệu giá lịch sử OHLCV, nhiều timeframe (1m, 5m, 1H, 1D, 1W, 1M)
- **Giao dịch** -- Bảng giá, top tăng/giảm
- **Công ty** -- Thông tin, cổ đông, ban lãnh đạo, sự kiện, tin tức, cổ tức
- **Tài chính** -- Bảng cân đối, kết quả kinh doanh, lưu chuyển tiền tệ
- **Niêm yết** -- Danh sách mã theo sàn, ngành ICB, nhóm (VN30, HNX30...)
- **Sàng lọc** -- Lọc cổ phiếu theo PE, ROE, vốn hóa...
- **Chỉ báo kỹ thuật** -- SMA, EMA, RSI
- **Hàng hóa** -- Giá vàng (BTMC, SJC, GiaVang.net), tỷ giá VCB
- **Realtime** -- WebSocket dữ liệu giá trực tiếp (SSI)
- **CLI** -- Command-line tool `vnstock` cho terminal users
- **TypeScript** -- Đầy đủ type definitions

## Cài đặt

```bash
# Dùng làm thư viện
npm install vnstock-js

# Cài CLI toàn cục
npm install -g vnstock-js

# Hoặc chạy một lần không cần cài
npx vnstock-js quote VCB
```

## CLI — Command-line tool

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

- `--json`, `--csv` — format output (suppress màu + bảng)
- `--no-color` — tắt màu
- `-v, --verbose` — hiện thêm chi tiết
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
- `symbolsUrl`, `holidaysUrl` — ghi đè URL GitHub mặc định
- `ttl` — thời gian cache tính bằng ms (mặc định 24h)
- `force` — bỏ qua cache và tải lại
- `cacheDir` — ghi đè vị trí cache
- `noCache` — tắt cache trên disk (chỉ dùng bộ nhớ)
- `timeout` — timeout tải dữ liệu tính bằng ms (mặc định 10s)

## Chỉ báo kỹ thuật

```ts
import { sma, ema, rsi } from 'vnstock-js';

const history = await stock.quote({ ticker: 'FPT', start: '2024-01-01' });

const sma20 = sma(history, { period: 20 });
const ema12 = ema(history, { period: 12 });
const rsi14 = rsi(history);
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
```

## Định dạng output

Tất cả dữ liệu được chuẩn hóa:

- **Array of Objects** -- sẵn sàng cho React, Vue, table, chart
- **camelCase** -- tên field tiếng Anh nhất quán
- **Giá chia 1000** -- đơn vị nghìn VND (25.5 = 25,500 VND)
- **Ngày ISO** -- "2024-01-15"
- **Phần trăm dạng decimal** -- 0.15 = 15%

## Nguồn dữ liệu

[VietCap](https://trading.vietcap.com.vn) (REST + GraphQL). Realtime qua [SSI](https://iboard.ssi.com.vn) WebSocket. Không cần xác thực.

## Tài liệu

Chi tiết và ví dụ: [vnstock-js-docs.vercel.app](https://vnstock-js-docs.vercel.app/)

## Lấy cảm hứng từ

[thinh-vu/vnstock](https://github.com/thinh-vu/vnstock) -- thư viện Python cho dữ liệu chứng khoán Việt Nam.

## Giấy phép

[Apache 2.0](LICENSE) -- ttqteo
