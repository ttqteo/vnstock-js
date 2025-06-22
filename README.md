# 📈 vnstock-js

A lightweight NPM package for fetching Vietnam stock market data from VCI.

## Quick Start

1. Install the package
```bash
npm install vnstock-js@latest
```

2. Quick Usage

2.1. Simple (recommended)
```ts
import { stock, commodity } from 'vnstock-js';

// Stock market data
const prices = await stock.price('VCI', '2025-01-01');

// Gold Price from SJC
const goldPrices = await commodity.gold.priceSJC();
```

2.2. Advanced
```ts
import vnstock from 'vnstock-js';

// Access everything directly
const prices = await vnstock.stock.quote.history({
  symbols: ['VCI'],
  start: '2025-01-01',
  timeFrame: '1D'
});
```

## Documentation
[vnstock-js-docs.vercel.app](https://vnstock-js-docs.vercel.app/)

## Note

This npm package inspired by [thinh-vu/vnstock](https://github.com/thinh-vu/vnstock)

## License
[Apache 2.0 License](LICENSE) Ⓒ ttqteo 2025