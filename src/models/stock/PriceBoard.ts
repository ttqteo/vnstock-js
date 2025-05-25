export interface PriceBoard {
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
