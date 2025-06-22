import { GoldPriceBTMC, GoldPriceGiaVangNet, GoldPriceSJC } from "../../models/commodity";
import axios from "axios";

export class GoldService {
  constructor() {}

  async goldPriceBTMC(): Promise<GoldPriceBTMC[]> {
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
      })) as GoldPriceBTMC[];

      return data;
    } catch (error: any) {
      throw new Error(`An error occurred while fetching price board data: ${error.message}`);
    }
  }

  async goldPriceGiaVangNet(): Promise<GoldPriceGiaVangNet[]> {
    const url =
      "https://api2.giavang.net/v1/gold/last-price?codes[]=XAUUSD&codes[]=USDX&codes[]=SJL1L10&codes[]=DOHNL&codes[]=DOHCML&codes[]=BTSJC&codes[]=PQHNVM&codes[]=VNGSJC&codes[]=VIETTINMSJC&codes[]=VNGN&codes[]=BT9999NTT&codes[]=PQHN24NTT&codes[]=DOJINHTV&codes[]=SJ9999";

    try {
      const response = await axios.get(url);
      const data = response.data.data as GoldPriceGiaVangNet[];
      return data;
    } catch (error: any) {
      throw new Error(`An error occurred while fetching price board data: ${error.message}`);
    }
  }

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
