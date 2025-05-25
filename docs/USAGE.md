# Quick Usage
1. Using the default instance (simplest approach):
```ts
import { stock, commodity } from 'vnstock-js';

// Stock market data
const prices = await stock.price('VNM', '2024-01-01');
const goldPrices = await commodity.gold.price();
```

2. Creating your own instance (more control):
```ts
import { Vnstock, createStockAPI, createCommodityAPI } from 'vnstock-js';

// Create your own instance
const vnstock = new Vnstock();
const stock = createStockAPI(vnstock);
const commodity = createCommodityAPI(vnstock);

// Use the APIs
const prices = await stock.price('VNM', '2024-01-01');
const goldPrices = await commodity.gold.price();
```

3. Using the full API (most control):
```ts
import vnstock from 'vnstock-js';

// Access everything directly
const prices = await vnstock.stock.quote.history({
  symbols: ['VNM'],
  start: '2024-01-01',
  timeFrame: '1D'
});
```