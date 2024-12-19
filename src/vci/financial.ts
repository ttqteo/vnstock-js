import axios from "axios";
import { validateDateFormat } from "../utils";
import { BASE_URL, GRAPHQL_URL } from "./const";

export default class Trading {
  constructor() {}

  async cpaEvents(symbol: string, fromDate: string, toDate: string) {
    validateDateFormat([fromDate, toDate]);
    const url = BASE_URL + "/api/fiin-api-service/cpa-event";
    const params = {
      ticker: symbol,
      fromDate,
      toDate,
      page: 0,
      size: 100,
      sort: "publicDate,desc",
    };
    const response = await axios.get(url, {
      params,
    });
    return response.data;
  }

  async ratio(symbol: string) {
    const url = GRAPHQL_URL;
    const payload = {
      operationName: "Query",
      variables: {
        ticker: symbol,
        period: "Y",
      },
      query:
        "fragment Ratios on CompanyFinancialRatio {\n  ticker\n  yearReport\n  lengthReport\n  updateDate\n  revenue\n  revenueGrowth\n  netProfit\n  netProfitGrowth\n  ebitMargin\n  roe\n  roic\n  roa\n  pe\n  pb\n  eps\n  currentRatio\n  cashRatio\n  quickRatio\n  interestCoverage\n  ae\n  netProfitMargin\n  grossMargin\n  ev\n  issueShare\n  ps\n  pcf\n  bvps\n  evPerEbitda\n  BSA1\n  BSA2\n  BSA5\n  BSA8\n  BSA10\n  BSA159\n  BSA16\n  BSA22\n  BSA23\n  BSA24\n  BSA162\n  BSA27\n  BSA29\n  BSA43\n  BSA46\n  BSA50\n  BSA209\n  BSA53\n  BSA54\n  BSA55\n  BSA56\n  BSA58\n  BSA67\n  BSA71\n  BSA173\n  BSA78\n  BSA79\n  BSA80\n  BSA175\n  BSA86\n  BSA90\n  BSA96\n  CFA21\n  CFA22\n  at\n  fat\n  acp\n  dso\n  dpo\n  ccc\n  de\n  le\n  ebitda\n  ebit\n  dividend\n  RTQ10\n  charterCapitalRatio\n  RTQ4\n  epsTTM\n  charterCapital\n  fae\n  RTQ17\n  CFA26\n  CFA6\n  CFA9\n  BSA85\n  CFA36\n  BSB98\n  BSB101\n  BSA89\n  CFA34\n  CFA14\n  ISB34\n  ISB27\n  ISA23\n  ISS152\n  ISA102\n  CFA27\n  CFA12\n  CFA28\n  BSA18\n  BSB102\n  BSB110\n  BSB108\n  CFA23\n  ISB41\n  BSB103\n  BSA40\n  BSB99\n  CFA16\n  CFA18\n  CFA3\n  ISB30\n  BSA33\n  ISB29\n  CFS200\n  ISA2\n  CFA24\n  BSB105\n  CFA37\n  ISS141\n  BSA95\n  CFA10\n  ISA4\n  BSA82\n  CFA25\n  BSB111\n  ISI64\n  BSB117\n  ISA20\n  CFA19\n  ISA6\n  ISA3\n  BSB100\n  ISB31\n  ISB38\n  ISB26\n  BSA210\n  CFA20\n  CFA35\n  ISA17\n  ISS148\n  BSB115\n  ISA9\n  CFA4\n  ISA7\n  CFA5\n  ISA22\n  CFA8\n  CFA33\n  CFA29\n  BSA30\n  BSA84\n  BSA44\n  BSB107\n  ISB37\n  ISA8\n  BSB109\n  ISA19\n  ISB36\n  ISA13\n  ISA1\n  BSB121\n  ISA14\n  BSB112\n  ISA21\n  ISA10\n  CFA11\n  ISA12\n  BSA15\n  BSB104\n  BSA92\n  BSB106\n  BSA94\n  ISA18\n  CFA17\n  ISI87\n  BSB114\n  ISA15\n  BSB116\n  ISB28\n  BSB97\n  CFA15\n  ISA11\n  ISB33\n  BSA47\n  ISB40\n  ISB39\n  CFA7\n  CFA13\n  ISS146\n  ISB25\n  BSA45\n  BSB118\n  CFA1\n  CFS191\n  ISB35\n  CFB65\n  CFA31\n  BSB113\n  ISB32\n  ISA16\n  CFS210\n  BSA48\n  BSA36\n  ISI97\n  CFA30\n  CFA2\n  CFB80\n  CFA38\n  CFA32\n  ISA5\n  BSA49\n  CFB64\n  __typename\n}\n\nquery Query($ticker: String!, $period: String!) {\n  CompanyFinancialRatio(ticker: $ticker, period: $period) {\n    ratio {\n      ...Ratios\n      __typename\n    }\n    period\n    __typename\n  }\n}\n",
    };
    const response = await axios.post(url, payload);
    return response.data;
  }

  async deals(symbol: string) {
    const url = GRAPHQL_URL;
    const payload = {
      operationName: "Query",
      variables: {
        ticker: symbol,
        limit: 15,
        offset: 0,
        offsetInsider: 0,
        fromDate: "2000-01-01",
        toDate: "2100-01-01",
      },
      query:
        "query Query($ticker: String!, $offset: Int!, $offsetInsider: Int!, $limit: Int!, $fromDate: String!, $toDate: String!) {\n  TickerPriceHistory(\n    ticker: $ticker\n    offset: $offset\n    limit: $limit\n    fromDate: $fromDate\n    toDate: $toDate\n  ) {\n    history {\n      tradingDate\n      stockType\n      ceilingPrice\n      floorPrice\n      referencePrice\n      openPrice\n      closePrice\n      matchPrice\n      priceChange\n      percentPriceChange\n      highestPrice\n      lowestPrice\n      averagePrice\n      totalMatchVolume\n      totalMatchValue\n      totalDealVolume\n      totalDealValue\n      totalVolume\n      totalValue\n      foreignNetTradingVolume\n      foreignNetTradingValue\n      foreignBuyValueMatched\n      foreignBuyVolumeMatched\n      foreignSellValueMatched\n      foreignSellVolumeMatched\n      foreignBuyValueDeal\n      foreignBuyVolumeDeal\n      foreignSellValueDeal\n      foreignSellVolumeDeal\n      foreignBuyValueTotal\n      foreignBuyVolumeTotal\n      foreignSellValueTotal\n      foreignSellVolumeTotal\n      foreignTotalRoom\n      foreignCurrentRoom\n      foreignHoldingVolume\n      suspension\n      delist\n      haltResumeFlag\n      split\n      benefit\n      meeting\n      notice\n      totalTrade\n      totalBuyTrade\n      totalBuyTradeVolume\n      totalSellTrade\n      totalSellTradeVolume\n      referencePriceAdjusted\n      openPriceAdjusted\n      closePriceAdjusted\n      priceChangeAdjusted\n      percentPriceChangeAdjusted\n      highestPriceAdjusted\n      lowestPriceAdjusted\n      unMatchedBuyTradeVolume\n      unMatchedSellTradeVolume\n      difVolumeBuySell\n      averageVolumeBuyOrder\n      averageVolumeSellOrder\n      __typename\n    }\n    totalRecords\n    __typename\n  }\n  OrganizationDeals(\n    ticker: $ticker\n    offset: $offsetInsider\n    limit: $limit\n    fromDate: $fromDate\n    toDate: $toDate\n  ) {\n    history {\n      id\n      organCode\n      tradeTypeCode\n      dealTypeCode\n      actionTypeCode\n      tradeStatusCode\n      traderOrganCode\n      shareBeforeTrade\n      ownershipBeforeTrade\n      shareRegister\n      shareAcquire\n      shareAfterTrade\n      ownershipAfterTrade\n      startDate\n      endDate\n      sourceUrl\n      publicDate\n      ticker\n      traderPersonId\n      traderName\n      en_TraderName\n      positionShortName\n      en_PositionShortName\n      positionName\n      en_PositionName\n      __typename\n    }\n    totalRecords\n    __typename\n  }\n}\n",
    };
    const response = await axios.post(url, payload);
    return response.data;
  }
}
