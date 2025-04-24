export interface IPriceBoard {
  listingInfo: {
    code: string;
    symbol: string;
    ceiling: number;
    floor: number;
    refPrice: number;
    stockType: string;
    board: string;
    exercisePrice: number;
    exerciseRatio: string;
    maturityDate: string;
    lastTradingDate: string;
    underlyingSymbol: string;
    issuerName: string;
    listedShare: number;
    receivedTime: string;
    messageType: string;
    type: string;
    id: number;
    enOrganName: string;
    enOrganShortName: string;
    organName: string;
    organShortName: string;
    ticker: string;
    priorClosePrice: number;
    benefit: string;
  };
  bidAsk: {
    code: string;
    symbol: string;
    session: string;
    bidPrices: [
      {
        price: number;
        volume: number;
      },
      {
        price: number;
        volume: number;
      },
      {
        price: number;
        volume: number;
      }
    ];
    receivedTime: string;
    messageType: string;
    askPrices: [
      {
        price: number;
        volume: number;
      },
      {
        price: number;
        volume: number;
      },
      {
        price: number;
        volume: number;
      }
    ];
    time: string;
  };
  matchPrice: {
    code: string;
    symbol: string;
    matchPrice: number;
    matchVol: number;
    receivedTime: string;
    messageType: string;
    accumulatedVolume: number;
    accumulatedValue: number;
    avgMatchPrice: number;
    highest: number;
    lowest: number;
    time: string;
    session: string;
    matchType: string;
    foreignSellVolume: number;
    foreignBuyVolume: number;
    currentRoom: number;
    totalRoom: number;
    totalAccumulatedValue: number;
    totalAccumulatedVolume: number;
    referencePrice: number;
  };
}

export interface IChartData {
  symbol: string;
  o: number[];
  h: number[];
  l: number[];
  c: number[];
  v: number[];
  t: number[];
  accumulatedVolume: number[];
  accumulatedValue: number[];
  minBatchTruncTime: number;
}

export interface ITicker {
  ticker_info: {
    ticker: string;
    organ_name: string;
  };
}

export interface ITickerInfo {
  ticker: string;
  organName: string;
  enOrganName: string;
  icbName3: string;
  enIcbName3: string;
  icbName2: string;
  enIcbName2: string;
  icbName4: string;
  enIcbName4: string;
  comTypeCode: string;
  icbCode1: string;
  icbCode2: string;
  icbCode3: string;
  icbCode4: string;
  __typename: string;
}

export interface IFinancialRatio {
  id: string;
  type: string; // *
  name: string; // *
  unit: string; // *
  isDefault: boolean;
  fieldName: string;
  en_Type: string;
  en_Name: string; // *
  tagName: string;
  comTypeCode: string; // *
  order: string; // *
  __typename: string;
}

export interface IIcb {
  icbCode: string;
  level: string;
  icbName: string;
  enIcbName: string;
  __typename: string;
}

export interface ISymbol {
  id: number;
  symbol: string;
  type: string;
  board: string;
  enOrganName: string;
  enOrganShortName: string;
  organShortName: string;
  organName: string;
}
