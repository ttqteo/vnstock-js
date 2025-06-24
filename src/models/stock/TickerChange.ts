export interface TickerChange {
  stockCode: string;
  lastPrice1DayAgo: number;
  lastPrice5DaysAgo: number;
  lastPrice20DaysAgo: number;
  group: "HOSE" | "HNX" | "UPCOM";
  marketCap: number;
  topStockType: "GAINER_1_D" | "LOSER_1_D" | "GAINER_5_D" | "LOSER_5_D" | "GAINER_20_D" | "LOSER_20_D";
  liquidity: number;
  vn30: boolean;
  hnx30: boolean;
}
