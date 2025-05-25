# 📈 vnstock-js

A lightweight NPM package for fetching Vietnam stock market data from VCI.

*inspired by [thinh-vu/vnstock](https://github.com/thinh-vu/vnstock)*

## Quick Start

```bash
npm install vnstock-js
```

```typescript
import { Vnstock } from "vnstock-js";

const { stock } = new Vnstock();

// Get current prices
await stock.trading.priceBoard(["VCB"]);

// Get historical data
await stock.quote.history({
  start: "2024-12-01",
  symbols: ["VCB"]
});

// Get all symbols
await stock.listing.allSymbols();
```

## Documentation
[vnstock-js-docs.vercel.app](https://vnstock-js-docs.vercel.app/)

## License
[Apache 2.0 License](LICENSE) Ⓒ ttqteo 2024