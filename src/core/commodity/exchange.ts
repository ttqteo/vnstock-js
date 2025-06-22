import axios from "axios";
import { format } from "date-fns";
import * as xlsx from "xlsx";
import { validateDateFormat } from "../../shared/utils";
import { ExchangeRateVCB } from "../../models/commodity";

export class ExchangeService {
  constructor() {}

  async exchangeRates(date?: string): Promise<ExchangeRateVCB[]> {
    if (date) {
      validateDateFormat([date]);
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
