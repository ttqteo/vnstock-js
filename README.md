# 📈 vnstock-js

**vnstock-js** is an NPM package for fetching stock market data from source VCI. It provides functionality to retrieve trading data, symbol listings, and more.

*inspired by [thinh-vu/vnstock](https://github.com/thinh-vu/vnstock)*

## vnstock-js docs

[vnstock-js-docs.vercel.app](https://vnstock-js-docs.vercel.app/)

## 🚀 Features
* Support **VCI** stock market data.
* Retrieve **trading prices**,  **historical quotes** and **symbols listings**.
* Support **Commodity Prices** *(Gold Price Vietnam)*.

## 📦 Installation

To install the package using npm:

```bash
npm install vnstock-js
```

Yarn:

```bash
yarn add vnstock-js
```

## ⚙️ Usage

Simple usage
```typescript
import { Vnstock } from "vnstock-js";

const { stock } = new Vnstock();

// Get Symbols Price 
await stock.trading.priceBoard(["VCB"]);

// Get Symbols History 
await stock.quote.history({
  start: "2024-12-01",
  symbols: ["VCB"]
});

// Get All Symbols
await stock.listing.allSymbols();
```

## ✅ Testing

Run tests using Jest:
```bash
npm test
```

## License

[Apache 2.0 License](LICENSE) Ⓒ ttqteo 2024