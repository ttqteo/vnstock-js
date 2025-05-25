export interface GoldPriceGiaVangNet {
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
  histories: GoldPriceGiaVangNet[];
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
