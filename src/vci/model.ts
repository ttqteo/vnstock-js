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
