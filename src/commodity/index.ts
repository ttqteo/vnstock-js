import axios from "axios";
import { format } from "date-fns";
import * as xlsx from "xlsx";
import utils from "../utils";
import { IGoldPrice, IGoldPriceV2 } from "./model";

export default class Commodity {
  constructor() {}

  /**
   * Fetches the latest gold price from BTMC API.
   *
   * @returns A Promise resolving to an array of IGoldPrice objects.
   * @throws Error if the request fails or the response is invalid.
   */
  async goldPrice(): Promise<IGoldPrice[]> {
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

  async goldPriceV2(): Promise<IGoldPriceV2[]> {
    const url =
      "https://api2.giavang.net/v1/gold/last-price?codes[]=XAUUSD&codes[]=USDX&codes[]=SJL1L10&codes[]=DOHNL&codes[]=DOHCML&codes[]=BTSJC&codes[]=PQHNVM&codes[]=VNGSJC&codes[]=VIETTINMSJC&codes[]=VNGN&codes[]=BT9999NTT&codes[]=PQHN24NTT&codes[]=DOJINHTV&codes[]=SJ9999";

    try {
      const response = await axios.get(url);
      const data = response.data.data as IGoldPriceV2[];
      return data;
    } catch (error: any) {
      throw new Error(`An error occurred while fetching price board data: ${error.message}`);
    }
  }

  async exchangeRates(date?: string) {
    if (date) {
      utils.validateDateFormat([date]);
    } else {
      date = format(new Date(), "yyyy-MM-dd");
    }
    const url = `https://www.vietcombank.com.vn/api/exchangerates/exportexcel?date=${date}`;

    try {
      const response = await axios.get(url);
      const { FileName, Data: base64Data } = response.data;

      const decodedData = Buffer.from(base64Data, "base64");
      const workbook = xlsx.read(decodedData, { type: "buffer" });
      const sheetName = "ExchangeRate";
      const sheet = workbook.Sheets[sheetName];
      const jsonData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      const columns = ["CurrencyCode", "CurrencyName", "Buy Cash", "Buy Transfer", "Sell"];

      const dataWithColumns = jsonData
        .slice(1)
        .map((row: any) => {
          const rowObject = {} as any;
          columns.forEach((col, index) => {
            rowObject[col] = row[index] || null;
          });
          return rowObject;
        })
        .filter((row: any) => row.CurrencyName !== null);

      return dataWithColumns;
    } catch (error: any) {
      throw new Error(`An error occurred while fetching VCB exchange rates data: ${error.message}`);
    }
  }
}
