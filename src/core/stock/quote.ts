import axios from "axios";
import { addDays, parse } from "date-fns";
import { CHART_URL, INTERVAL_MAP } from "@/shared/const";
import { ChartData } from "@/models/stock/ChartData";

export default class Quote {
  constructor() {}

  /**
   * Fetches historical price data for the specified symbols and time frame.
   *
   * @param {Object} params - The parameters for fetching historical data.
   * @param {string[]} params.symbols - An array of symbols to fetch data for.
   * @param {string} params.start - The start date for the historical data in 'yyyy-MM-dd' format.
   * @param {string} [params.end] - The optional end date for the historical data in 'yyyy-MM-dd' format.
   * @param {string} [params.timeFrame="1D"] - The time frame for the data, default is "1D".
   * @param {number} [params.countBack=365] - The number of days to count back from the start date, default is 365.
   * @returns {Promise<ChartData[]>} A Promise that resolves to an array of PriceBoard objects.
   * @throws {VnstockError} If any error occurs during the data fetching process or if the response is invalid.
   */

  async history({
    symbols,
    start,
    end,
    timeFrame = "1D",
    countBack = 365,
  }: {
    symbols: string[];
    start: string;
    end?: string;
    timeFrame?: string;
    countBack?: number;
  }): Promise<ChartData[]> {
    this.inputValidation(timeFrame);
    timeFrame = INTERVAL_MAP[timeFrame as keyof typeof INTERVAL_MAP];

    const from = Math.round(parse(start, "yyyy-MM-dd", new Date()).getTime() / 1000);
    const to = Math.round(addDays(end ? parse(end, "yyyy-MM-dd", new Date()) : new Date(), 2).getTime() / 1000);
    if (to !== undefined && from > to) {
      throw new Error(`Start Date cannot greater than End Date`);
    }

    const url = CHART_URL;
    const payload = {
      symbols,
      from,
      to,
      timeFrame,
      countBack,
    };

    try {
      const response = await axios.post(url, payload);

      if (response.status !== 200) {
        throw new Error(`Error fetching data: ${response.status} - ${JSON.stringify(response.data)}`);
      }

      const { data } = response as { data: ChartData[] };

      return data;
    } catch (error: any) {
      throw new Error(`An error occurred while fetching price board data: ${error.message}`);
    }
  }

  /**
   * Validates the input timeFrame against the available intervals.
   * If the timeFrame is not provided, it will be ignored.
   * @throws {VnstockError} If the timeFrame is invalid.
   * @param {string} [timeFrame] The timeFrame to validate.
   * @private
   */
  private inputValidation(timeFrame?: string) {
    if (timeFrame) {
      if (!(timeFrame in INTERVAL_MAP)) {
        throw new Error(`Invalid timeFrame ${timeFrame}, it should be one of ${Object.keys(INTERVAL_MAP).join(", ")}`);
      }
    }
  }
}
