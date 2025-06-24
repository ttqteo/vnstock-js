import axios from "axios";
import { BASE_URL, headers, INTERVAL_MAP } from "../../shared/constants";
import { PriceBoard } from "../../models/stock";
import { TickerChange } from "../../models/stock/TickerChange";
import { inputValidation } from "../../shared/utils";

export default class Trading {
  constructor() {}

  /**
   * Fetches price board data for the given list of symbols.
   * Lấy dữ liệu bảng giá cho danh sách các mã chứng khoán được cung cấp.
   */
  async priceBoard(symbols: string[]): Promise<PriceBoard[]> {
    if (!Array.isArray(symbols) || symbols.length === 0) {
      throw new Error("Symbols array cannot be empty or invalid.");
    }

    const payload = { symbols };
    const url = BASE_URL + "/api/price/symbols/getList";

    try {
      const response = await axios.post(url, payload, {
        headers: headers,
      });

      if (response.status !== 200) {
        throw new Error(`Error fetching data: ${response.status} - ${JSON.stringify(response.data)}`);
      }

      const { data } = response as { data: PriceBoard[] };

      return data;
    } catch (error: any) {
      throw new Error(`An error occurred while fetching price board data: ${error.message}`);
    }
  }

  /**
   * Fetches the top gaining stocks for a given time frame.
   * Lấy danh sách các cổ phiếu tăng giá mạnh nhất trong một khoảng thời gian.
   * @param timeFrame - The time frame (e.g., 'ONE_DAY', 'ONE_WEEK', 'ONE_MONTH', 'THREE_MONTHS', 'SIX_MONTHS', 'ONE_YEAR').
   */
  async topGainers({ timeFrame = "1D" }: { timeFrame?: string }): Promise<TickerChange[]> {
    inputValidation(timeFrame);
    timeFrame = INTERVAL_MAP[timeFrame as keyof typeof INTERVAL_MAP];

    const payload = {
      timeFrame: timeFrame,
      topStockType: 1,
    };
    const url = BASE_URL + "/api/price-alert-service/api/v1/non-authen/top-stock-change";

    try {
      const response = await axios.post(url, payload, {
        headers: headers,
      });

      if (response.status !== 200) {
        throw new Error(`Error fetching data: ${response.status} - ${JSON.stringify(response.data)}`);
      }

      const { data } = response as { data: TickerChange[] };

      return data;
    } catch (error: any) {
      throw new Error(`An error occurred while fetching top gainers data: ${error.message}`);
    }
  }

  /**
   * Fetches the top losing stocks for a given time frame.
   * Lấy danh sách các cổ phiếu giảm giá mạnh nhất trong một khoảng thời gian.
   */
  async topLosers({ timeFrame = "1D" }: { timeFrame?: string }): Promise<TickerChange[]> {
    inputValidation(timeFrame);
    timeFrame = INTERVAL_MAP[timeFrame as keyof typeof INTERVAL_MAP];

    const payload = {
      timeFrame: timeFrame,
      topStockType: 0,
    };
    const url = BASE_URL + "/api/price-alert-service/api/v1/non-authen/top-stock-change";

    try {
      const response = await axios.post(url, payload, {
        headers: headers,
      });

      if (response.status !== 200) {
        throw new Error(`Error fetching data: ${response.status} - ${JSON.stringify(response.data)}`);
      }

      const { data } = response as { data: TickerChange[] };

      return data;
    } catch (error: any) {
      throw new Error(`An error occurred while fetching top losers data: ${error.message}`);
    }
  }
}
