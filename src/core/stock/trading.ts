import axios from "axios";
import { BASE_URL } from "../../shared/constants";
import { PriceBoard } from "@/models/stock";

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
      const response = await axios.post(url, payload);

      if (response.status !== 200) {
        throw new Error(`Error fetching data: ${response.status} - ${JSON.stringify(response.data)}`);
      }

      const { data } = response as { data: PriceBoard[] };

      return data;
    } catch (error: any) {
      throw new Error(`An error occurred while fetching price board data: ${error.message}`);
    }
  }
}
