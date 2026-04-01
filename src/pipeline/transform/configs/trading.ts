import { TransformConfig } from "../../types";

export const tickerChangeTransformConfig: TransformConfig = {
  fieldMap: {
    stockCode: "symbol",
    lastPrice1DayAgo: "price1DayAgo",
    lastPrice5DaysAgo: "price5DaysAgo",
    lastPrice20DaysAgo: "price20DaysAgo",
    group: "exchange",
    marketCap: "marketCap",
    topStockType: "type",
    liquidity: "liquidity",
    vn30: "vn30",
    hnx30: "hnx30",
  },
  priceFields: ["price1DayAgo", "price5DaysAgo", "price20DaysAgo"],
  dateFields: [],
  percentFields: [],
  keepExtra: false,
};

export const priceBoardTransformConfig = {
  listingInfo: {
    fieldMap: {
      symbol: "symbol",
      ceiling: "ceilingPrice",
      floor: "floorPrice",
      refPrice: "referencePrice",
      board: "exchange",
      organName: "companyName",
      enOrganName: "companyNameEn",
      listedShare: "listedShares",
    },
    priceFields: ["ceilingPrice", "floorPrice", "referencePrice"],
    dateFields: [],
    percentFields: [],
  } as TransformConfig,

  matchPrice: {
    fieldMap: {
      matchPrice: "price",
      matchVol: "matchVolume",
      accumulatedVolume: "totalVolume",
      accumulatedValue: "totalValue",
      avgMatchPrice: "averagePrice",
      highest: "highestPrice",
      lowest: "lowestPrice",
      foreignBuyVolume: "foreignBuyVolume",
      foreignSellVolume: "foreignSellVolume",
      referencePrice: "referencePrice",
    },
    priceFields: ["price", "averagePrice", "highestPrice", "lowestPrice", "referencePrice"],
    dateFields: [],
    percentFields: [],
  } as TransformConfig,
};
