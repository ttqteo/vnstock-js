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
- **TypeScript** -- Đầy đủ type definitions

## Cài đặt

```bash
npm install vnstock-js
```

## Sử dụng nhanh

```ts
import { stock, commodity } from 'vnstock-js';

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
