import axios from "axios";
import { IGoldPrice } from "./model";

export default class Commodity {
  constructor() {}

  /**
   * Fetches the latest gold price from BTMC API.
   *
   * @returns A Promise resolving to an array of IGoldPrice objects.
   * @throws Error if the request fails or the response is invalid.
   */
  public async goldPrice(): Promise<IGoldPrice[]> {
    const url = "http://api.btmc.vn/api/BTMCAPI/getpricebtmc?key=3kd8ub1llcg9t45hnoh8hmn7t5kc2v";

    try {
      const response = await axios.get(url);
      const data = response.data.DataList.Data.map((item: any, idx: number) => ({
        name: item[`@n_${idx + 1}`],
        kara: item[`@k_${idx + 1}`],
        vol: item[`@h_${idx + 1}`],
        buy: item[`@pb_${idx + 1}`],
        sell: item[`@ps_${idx + 1}`],
        world: item[`@pt_${idx + 1}`],
        updatedAt: item[`@d_${idx + 1}`],
      })) as IGoldPrice[];

      return data;
    } catch (error: any) {
      throw new Error(`An error occurred while fetching price board data: ${error.message}`);
    }
  }
}
