import axios from "axios";
import { GoldPriceSJC, GoldPriceV1, GoldPriceV2 } from "@/models/commodity";

export class GoldService {
  constructor() {}

  /**
   * Fetches the latest gold price from BTMC API.
   *
   * @returns A Promise resolving to an array of GoldPriceV1 objects.
   * @throws Error if the request fails or the response is invalid.
   */
  async goldPrice(): Promise<GoldPriceV1[]> {
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
      })) as GoldPriceV1[];

      return data;
    } catch (error: any) {
      throw new Error(`An error occurred while fetching price board data: ${error.message}`);
    }
  }

  /**
   * Fetches the latest gold price from giavang.net API.
   *
   * @returns A Promise resolving to an array of GoldPriceV2 objects.
   * @throws Error if the request fails or the response is invalid.
   */
  async goldPriceV2(): Promise<GoldPriceV2[]> {
    const url =
      "https://api2.giavang.net/v1/gold/last-price?codes[]=XAUUSD&codes[]=USDX&codes[]=SJL1L10&codes[]=DOHNL&codes[]=DOHCML&codes[]=BTSJC&codes[]=PQHNVM&codes[]=VNGSJC&codes[]=VIETTINMSJC&codes[]=VNGN&codes[]=BT9999NTT&codes[]=PQHN24NTT&codes[]=DOJINHTV&codes[]=SJ9999";

    try {
      const response = await axios.get(url);
      const data = response.data.data as GoldPriceV2[];
      return data;
    } catch (error: any) {
      throw new Error(`An error occurred while fetching price board data: ${error.message}`);
    }
  }

  /**
   * Fetches the latest gold price from SJC API.
   *
   * @returns A Promise resolving to an array of IGoldPriceSJC objects.
   * @throws Error if the request fails or the response is invalid.
   */
  async goldPriceSJC(): Promise<GoldPriceSJC[]> {
    const url = "https://sjc.com.vn/GoldPrice/Services/PriceService.ashx";

    try {
      const response = await axios.get(url);
      const data = response.data.data as GoldPriceSJC[];
      return data;
    } catch (error: any) {
      throw new Error(`An error occurred while fetching price board data: ${error.message}`);
    }
  }
}
