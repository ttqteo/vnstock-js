import axios from "axios";
import { TRADING_URL } from "./const";
import { IPriceBoard } from "./model";

export default class Trading {
  constructor() {}

  /**
   * Fetches the price board data for the specified symbols.
   *
   * @param symbols - An array of trading symbols to query.
   * @returns A Promise resolving to an array of PriceBoard objects.
   * @throws Error if the request fails or the response status is not 200.
   */

  public async priceBoard(symbols: string[]): Promise<IPriceBoard[]> {
    if (!Array.isArray(symbols) || symbols.length === 0) {
      throw new Error("Symbols array cannot be empty or invalid.");
    }

    const url = TRADING_URL + `?tickers=${symbols.join(",")}`;

    try {
      const response = await axios.get(url);

      if (response.status !== 200) {
        throw new Error(`Error fetching data: ${response.status} - ${JSON.stringify(response.data)}`);
      }

      const { data } = response as { data: { data: IPriceBoard[] } };

      return data.data;
    } catch (error: any) {
      throw new Error(`An error occurred while fetching price board data: ${error.message}`);
    }
  }
}
