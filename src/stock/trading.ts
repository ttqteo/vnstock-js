import axios from "axios";
import { BASE_URL } from "./const";
import { IPriceBoard } from "./model";

export default class Trading {
  constructor() {}

  /**
   * Fetches price board data for the given list of symbols.
   *
   * @param symbols - An array of trading symbols to query.
   * @returns A Promise resolving to an array of PriceBoard objects.
   * @throws Error if the request fails or the response is invalid.
   */
  async priceBoard(symbols: string[]): Promise<IPriceBoard[]> {
    if (!Array.isArray(symbols) || symbols.length === 0) {
      throw new Error("Symbols array cannot be empty or invalid.");
    }

    const payload = { symbols };
    const url = BASE_URL + "/api/price/symbols/getList";

    try {
      const response = await axios.post(url, payload);

      if (response.status !== 200) {
        throw new Error(`Error fetching data: ${response.status} - ${JSON.stringify(response.data)}`);
      }

      const { data } = response as { data: IPriceBoard[] };

      return data;
    } catch (error: any) {
      throw new Error(`An error occurred while fetching price board data: ${error.message}`);
    }
  }
}
