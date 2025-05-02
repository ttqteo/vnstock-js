export interface IGoldPrice {
  name: string;
  kara: string;
  vol: string;
  buy: string;
  sell: string;
  world: string;
  updatedAt: string;
}

export interface IGoldPriceV2 {
  alter_buy: number;
  alter_sell: number;
  buy: number;
  buy_avg: number;
  buy_max: number;
  buy_min: number;
  count_buy: number;
  count_sell: number;
  create_day: number;
  create_month: number;
  create_year: number;
  histories: IGoldPriceV2[];
  id: number;
  open_buy: number;
  open_sell: number;
  sell: number;
  sell_avg: number;
  sell_max: number;
  sell_min: number;
  type: string;
  type_code: string;
  update_time: number;
  yesterday_buy: number;
  yesterday_sell: number | null;
}

export interface IExchangRate {
  CurrencyCode: string;
  CurrencyName: string;
  "Buy Cash": string;
  "Buy Transfer": string;
  Sell: string;
}
