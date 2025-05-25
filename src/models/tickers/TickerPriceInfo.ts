import { TickerFinancialRatio } from "./TickerFinancialRatio";

export interface TickerPriceInfo {
  financialRatio: TickerFinancialRatio;
  ticker: string;
  exchange: string;
  ev: number;
  ceilingPrice: number;
  floorPrice: number;
  referencePrice: number;
  openPrice: number;
  matchPrice: number;
  closePrice: number;
  priceChange: number;
  percentPriceChange: number;
  highestPrice: number;
  lowestPrice: number;
  totalVolume: number;
  highestPrice1Year: number;
  lowestPrice1Year: number;
  percentLowestPriceChange1Year: number;
  percentHighestPriceChange1Year: number;
  foreignTotalVolume: number;
  foreignTotalRoom: number;
  averageMatchVolume2Week: number;
  foreignHoldingRoom: number;
  currentHoldingRatio: number;
  maxHoldingRatio: number;
}
