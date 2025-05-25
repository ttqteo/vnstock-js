# Usage

```
import { GoldService } from '@/commodity/gold';
import { ExchangeService } from '@/commodity/exchange';

// Create instances of the services
const goldService = new GoldService();
const exchangeService = new ExchangeService();

// Get gold prices
const goldPrices = await goldService.goldPrice();
const goldPricesV2 = await goldService.goldPriceV2();
const sjcGoldPrices = await goldService.goldPriceSJC();

// Get exchange rates
const exchangeRates = await exchangeService.exchangeRates();
// Or with a specific date
const exchangeRatesWithDate = await exchangeService.exchangeRates('2024-03-20');
```