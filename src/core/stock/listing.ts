import axios from "axios";
import { ALL_SYMBOLS_URL, BASE_URL, GRAPHQL_URL, GROUP_CODE, headers } from "../../shared/constants";
import { Symbol, Ticker } from "@/models/stock";

export default class Listing {
  constructor() {}

  /**
   * Fetches all available stock symbols from VCI.
   * Lấy tất cả các mã chứng khoán từ VCI.
   */
  async allSymbols() {
    const url = ALL_SYMBOLS_URL;

    try {
      const response = await axios.get(url, {
        headers: headers,
      });

      if (response.status !== 200) {
        throw new Error(`Error fetching data: ${response.status} - ${JSON.stringify(response.data)}`);
      }

      const { data } = response as { data: { record_count: number; ticker_info: Ticker[] } };

      return data;
    } catch (error: any) {
      throw new Error(`An error occurred while fetching price board data: ${error.message}`);
    }
  }

  /**
   * Fetches all available stock symbols from VCI, grouped by exchange.
   * Lấy tất cả các mã chứng khoán từ VCI, nhóm theo sàn giao dịch.
   */
  async symbolsByExchange() {
    const url = BASE_URL + "/api/price/symbols/getAll";
    try {
      const response = await axios.get(url, {
        headers: headers,
      });
      if (response.status !== 200) {
        throw new Error(`Error fetching data: ${response.status} - ${JSON.stringify(response.data)}`);
      }
      const { data } = response as { data: Symbol[] };
      return data;
    } catch (error: any) {
      throw new Error(`An error occurred while fetching symbols by exchange data: ${error.message}`);
    }
  }

  /**
   * Fetches all available stock symbols from VCI, grouped by industries.
   * Lấy tất cả các mã chứng khoán từ VCI, nhóm theo ngành.
   */
  async symbolsByIndustries() {
    const url = GRAPHQL_URL;
    const payload = {
      variables: {},
      query:
        "{\n  CompaniesListingInfo {\n    ticker\n    organName\n    enOrganName\n    icbName3\n    enIcbName3\n    icbName2\n    enIcbName2\n    icbName4\n    enIcbName4\n    comTypeCode\n    icbCode1\n    icbCode2\n    icbCode3\n    icbCode4\n    __typename\n  }\n}\n",
    };
    try {
      const response = await axios.post(url, payload, {
        headers: headers,
      });
      if (response.status !== 200) {
        throw new Error(`Error fetching data: ${response.status} - ${JSON.stringify(response.data)}`);
      }

      let parsedData;
      if (typeof response.data === "string") {
        parsedData = JSON.parse(response.data);
      } else {
        parsedData = response.data;
      }

      if (!parsedData.data || !parsedData.data.CompaniesListingInfo) {
        throw new Error("Invalid response structure: missing CompaniesListingInfo");
      }

      return { data: parsedData.data.CompaniesListingInfo };
    } catch (error: any) {
      throw new Error(`An error occurred while fetching symbols by industries data: ${error.message}`);
    }
  }

  /**
   * Fetches all available industry codes from VCI.
   * Lấy tất cả các mã ngành từ VCI.
   */
  async industriesIcb() {
    const url = GRAPHQL_URL;
    const payload = {
      operationName: "Query",
      variables: {},
      query: "query Query {\n  ListIcbCode {\n    icbCode\n    level\n    icbName\n    enIcbName\n    __typename\n  }\n}\n",
    };
    try {
      const response = await axios.post(url, payload, {
        headers: headers,
      });
      if (response.status !== 200) {
        throw new Error(`Error fetching data: ${response.status} - ${JSON.stringify(response.data)}`);
      }

      let parsedData;
      if (typeof response.data === "string") {
        parsedData = JSON.parse(response.data);
      } else {
        parsedData = response.data;
      }

      if (!parsedData.data || !parsedData.data.ListIcbCode) {
        throw new Error("Invalid response structure: missing ListIcbCode");
      }

      return { data: parsedData.data.ListIcbCode };
    } catch (error: any) {
      throw new Error(`An error occurred while fetching industries icb data: ${error.message}`);
    }
  }

  /**
   * Fetches all available stock symbols from VCI, grouped by group.
   * Lấy tất cả các mã chứng khoán từ VCI, nhóm theo nhóm.
   */
  async symbolsByGroup({ group = "VN30" }: { group?: string }) {
    this.inputValidation(group);
    const url = "https://mt.vietcap.com.vn/api/price/symbols/getByGroup";
    try {
      const response = await axios.get(url, { params: { group }, headers: headers });
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
   * Kiểm tra tính hợp lệ của nhóm.
   * Nếu nhóm không được cung cấp, nó sẽ bị bỏ qua.
   */
  private inputValidation(group: string) {
    if (!GROUP_CODE.includes(group)) {
      throw new Error(`Invalid group code: ${group}. Must be one of: ${GROUP_CODE.join(", ")}`);
    }
  }
}
