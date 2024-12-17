# 📈 vnstock-js

**vnstock-js** is an NPM package for fetching stock market data from multiple sources like VCI and TCBS. It provides functionality to retrieve trading data, symbol listings, and more.


*inspired by [thinh-vu/vnstock](https://github.com/thinh-vu/vnstock)*

## 🚀 Features
* Support for **VCI** and **TCBS** stock market data.
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

Simple usage with VCI source
```typescript
import { Vnstock } from "vnstock-js";

// This data get from Viet Capital Securities
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

TCBS source

```typescript
import { Vnstock } from "vnstock-js";

// This data get from TCBS Securities
const { stock } = new Vnstock("TCBS");

// Get Symbols Price 
await stock.trading.priceBoard(["VCB"]);
```

## 📚 API Documentation
Class: `Vnstock`

| Method                                   | Description                                                                      |
|------------------------------------------|----------------------------------------------------------------------------------|
| **`new Vnstock(source?: string)`**       | Initialize a new instance with a source. Default is `"VCI"`. Available sources: `"VCI"`, `"TCBS"`. |
| **`trading.priceBoard(symbols: string[])`** | Retrieve trading prices for a list of symbols.                                   |
| **`quote.history(options)`**             | Fetch historical data for given symbols, timeframe, and start date.              |
| **`listing.allSymbols()`**               | Get a list of all stock symbols.                                                 |
| **`commodity.gold()`**                   | Fetch gold prices in Vietnam.                                                   |

## ✅ Testing

Run tests using Jest:
```bash
npm test
```

## License

[Apache 2.0 License](LICENSE) Ⓒ ttqteo 2024