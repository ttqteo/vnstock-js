export interface IGoldPrice {
  name: string;
  kara: string;
  vol: string;
  buy: string;
  sell: string;
  world: string;
  updatedAt: string;
}

export interface IExchangRate {
  CurrencyCode: string;
  CurrencyName: string;
  "Buy Cash": string;
  "Buy Transfer": string;
  Sell: string;
}
