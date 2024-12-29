import axios from "axios";
import { ALL_SYMBOLS_URL, BASE_URL, GRAPHQL_URL, GROUP_CODE } from "./const";
import { IIcb, ISymbol, ITicker, ITickerInfo } from "./model";

export default class Listing {
  constructor() {}

  /**
   * Fetches all available stock symbols from VCI.
   *
   * @returns A Promise resolving to an object with a `record_count` property
   *          indicating the number of records in the response, and a `ticker_info`
   *          property containing an array of `ITicker` objects.
   * @throws {Error} If the request fails or the response is invalid.
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

  /**
   * Fetches all available stock symbols from VCI, grouped by exchange.
   *
   * @returns A Promise resolving to an array of `ISymbol` objects.
   * @throws {Error} If the request fails or the response is invalid.
   */
  async symbolsByExchange() {
    const url = BASE_URL + "/api/price/symbols/getAll";
    try {
      const response = await axios.get(url);
      if (response.status !== 200) {
        throw new Error(`Error fetching data: ${response.status} - ${JSON.stringify(response.data)}`);
      }
      const { data } = response as { data: ISymbol[] };
      return data;
    } catch (error: any) {
      throw new Error(`An error occurred while fetching symbols by exchange data: ${error.message}`);
    }
  }

  /**
   * Fetches all available stock symbols from VCI, grouped by industries.
   *
   * @returns A Promise resolving to an object containing a `data` property,
   *          which is an array of `ITickerInfo` objects with detailed company
   *          listing information.
   * @throws {Error} If the request fails or the response is invalid.
   */
  async symbolsByIndustries() {
    const url = GRAPHQL_URL;
    const payload = {
      variables: {},
      query:
        "{\n  CompaniesListingInfo {\n    ticker\n    organName\n    enOrganName\n    icbName3\n    enIcbName3\n    icbName2\n    enIcbName2\n    icbName4\n    enIcbName4\n    comTypeCode\n    icbCode1\n    icbCode2\n    icbCode3\n    icbCode4\n    __typename\n  }\n}\n",
    };
    try {
      const response = await axios.post(url, payload);
      if (response.status !== 200) {
        throw new Error(`Error fetching data: ${response.status} - ${JSON.stringify(response.data)}`);
      }
      const { data } = response as { data: { CompaniesListingInfo: ITickerInfo[] } };
      return { data: data.CompaniesListingInfo };
    } catch (error: any) {
      throw new Error(`An error occurred while fetching symbols by industries data: ${error.message}`);
    }
  }

  /**
   * Fetches all available industry codes from VCI.
   *
   * @returns A Promise resolving to an object containing a `data` property,
   *          which is an array of `IIcb` objects with detailed industry code
   *          information.
   * @throws {Error} If the request fails or the response is invalid.
   */
  async industriesIcb() {
    const url = GRAPHQL_URL;
    const payload = {
      operationName: "Query",
      variables: {},
      query: "query Query {\n  ListIcbCode {\n    icbCode\n    level\n    icbName\n    enIcbName\n    __typename\n  }\n}\n",
    };
    try {
      const response = await axios.post(url, payload);
      if (response.status !== 200) {
        throw new Error(`Error fetching data: ${response.status} - ${JSON.stringify(response.data)}`);
      }
      const { data } = response as { data: { ListIcbCode: IIcb[] } };
      return { data: data.ListIcbCode };
    } catch (error: any) {
      throw new Error(`An error occurred while fetching industries icb data: ${error.message}`);
    }
  }

  async symbolsByGroup({ group = "VN30" }: { group?: string }) {
    this.inputValidation(group);
    const url = "https://mt.vietcap.com.vn/api/price/symbols/getByGroup";
    try {
      const response = await axios.get(url, { params: { group } });
      if (response.status !== 200) {
        throw new Error(`Error fetching data: ${response.status} - ${JSON.stringify(response.data)}`);
      }
      const { data } = response;
      return data;
    } catch (error: any) {
      throw new Error(`An error occurred while fetching industries icb data: ${error.message}`);
    }
  }

  /**
   * Validates the input group against the available groups.
   * If the group is not provided, it will be ignored.
   * @throws {Error} If the group is invalid.
   * @param {string} [group] The group to validate.
   * @private
   */
  private inputValidation(group?: string) {
    if (group) {
      if (!GROUP_CODE.includes(group)) {
        throw new Error(`Invalid group ${group}, it should be one of ${GROUP_CODE.join(", ")}`);
      }
    }
  }
}
