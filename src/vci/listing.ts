import axios from "axios";
import { ALL_SYMBOLS_URL, BASE_URL, GRAPHQL_URL } from "./const";
import { ITicker } from "./model";

export default class Listing {
  constructor() {}

  /**
   * Fetches all available stock symbols from VCI.
   *
   * @returns A Promise resolving to an object with a `record_count` property
   *          indicating the number of records in the response, and a `ticker_info`
   *          property containing an array of `ITicker` objects.
   * @throws {VnstockError} If the request fails or the response is invalid.
   */
  async allSymbols() {
    const url = ALL_SYMBOLS_URL;

    try {
      const response = await axios.get(url);

      if (response.status !== 200) {
        throw new Error(`Error fetching data: ${response.status} - ${JSON.stringify(response.data)}`);
      }

      const { data } = response as { data: { record_count: number; ticker_info: ITicker[] } };

      return data;
    } catch (error: any) {
      throw new Error(`An error occurred while fetching price board data: ${error.message}`);
    }
  }

  async getAll() {
    const url = BASE_URL + "/api/price/symbols/getAll";
    const response = await axios.get(url);
    /*
    {
      "id": 8424561,
      "symbol": "VCB",
      "type": "STOCK",
      "board": "HSX",
      "enOrganName": "Joint Stock Commercial Bank For Foreign Trade Of Vietnam",
      "enOrganShortName": "Vietcombank",
      "organShortName": "Vietcombank",
      "organName": "Ngân hàng Thương mại Cổ phần Ngoại thương Việt Nam"
    },
    */
    return response.data;
  }

  async companiesListing() {
    const url = GRAPHQL_URL;
    const payload = {
      variables: {},
      query:
        "{\n  CompaniesListingInfo {\n    ticker\n    organName\n    enOrganName\n    icbName3\n    enIcbName3\n    icbName2\n    enIcbName2\n    icbName4\n    enIcbName4\n    comTypeCode\n    icbCode1\n    icbCode2\n    icbCode3\n    icbCode4\n    __typename\n  }\n}\n",
    };
    const response = await axios.post(url, payload);
    return response.data;
  }

  async icdListing() {
    const url = GRAPHQL_URL;
    const payload = {
      operationName: "Query",
      variables: {},
      query: "query Query {\n  ListIcbCode {\n    icbCode\n    level\n    icbName\n    enIcbName\n    __typename\n  }\n}\n",
    };
    const response = await axios.post(url, payload);
    return response.data;
  }

  async symbolPriceHistory(symbol: string) {
    const url = GRAPHQL_URL;
    const payload = {
      operationName: "Query",
      variables: {
        ticker: symbol,
        fromDate: "2023-12-19T09:07:13.169Z",
        toDate: "2024-12-19T09:07:13.169Z",
        offset: 0,
        limit: 9999,
      },
      query:
        "query Query($ticker: String!, $offset: Int!, $limit: Int!, $fromDate: String!, $toDate: String!) {\n  TickerPriceHistory(\n    ticker: $ticker\n    offset: $offset\n    limit: $limit\n    fromDate: $fromDate\n    toDate: $toDate\n  ) {\n    history {\n      tradingDate\n      closePrice\n      closePriceAdjusted\n      __typename\n    }\n    __typename\n  }\n}\n",
    };
    const response = await axios.post(url, payload);
    return response.data;
  }
}
