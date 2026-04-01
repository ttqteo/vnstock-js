import { TransformConfig } from "../../types";

export const goldBtmcTransformConfig: TransformConfig = {
  fieldMap: {
    name: "name",
    kara: "karat",
    vol: "weight",
    buy: "buyPrice",
    sell: "sellPrice",
    world: "worldPrice",
    updatedAt: "updatedAt",
  },
  priceFields: [],
  dateFields: [],
  percentFields: [],
};

export const goldSjcTransformConfig: TransformConfig = {
  fieldMap: {
    Id: "id",
    TypeName: "type",
    BranchName: "branch",
    BuyValue: "buyPrice",
    SellValue: "sellPrice",
    BuyDifferValue: "buyChange",
    SellDifferValue: "sellChange",
  },
  priceFields: [],
  dateFields: [],
  percentFields: [],
};

export const exchangeRateTransformConfig: TransformConfig = {
  fieldMap: {
    CurrencyCode: "currencyCode",
    CurrencyName: "currencyName",
    "Buy Cash": "buyCash",
    "Buy Transfer": "buyTransfer",
    Sell: "sell",
  },
  priceFields: [],
  dateFields: [],
  percentFields: [],
};
