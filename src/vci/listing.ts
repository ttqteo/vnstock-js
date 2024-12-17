import axios from "axios";
import { ALL_SYMBOLS_URL } from "./const";
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
}
