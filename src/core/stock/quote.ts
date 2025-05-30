import axios from "axios";
import { addDays, parse } from "date-fns";
import { CHART_URL, INTERVAL_MAP } from "@/shared/constants";
import { ChartData } from "@/models/stock/ChartData";

export default class Quote {
  constructor() {}

  /**
   * Fetches historical price data for the specified symbols and time frame.
   * Lấy dữ liệu lịch sử giá cho các mã chứng khoán được cung cấp trong khoảng thời gian được chỉ định.
   */
  async history({
    symbols,
    start,
    end,
    timeFrame,
    countBack = 365,
  }: {
    symbols: string[];
    start: string;
    end?: string;
    timeFrame: string;
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
   * Kiểm tra tính hợp lệ của tham số timeFrame.
   * Nếu tham số timeFrame không được cung cấp, nó sẽ bị bỏ qua.
   */
  private inputValidation(timeFrame?: string) {
    if (timeFrame) {
      if (!(timeFrame in INTERVAL_MAP)) {
        throw new Error(`Invalid timeFrame ${timeFrame}, it should be one of ${Object.keys(INTERVAL_MAP).join(", ")}`);
      }
    }
  }
}
