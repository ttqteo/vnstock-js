import { format } from "date-fns";
import * as XLSX from "xlsx";
import { fetchWithRetry } from "../../pipeline/fetch";
import { applyTransform } from "../../pipeline/transform";
import { exchangeRateTransformConfig } from "../../pipeline/transform/configs/commodity";
import { ExchangeRate } from "../../models/normalized";

export class ExchangeService {
  async exchangeRates(date?: string): Promise<ExchangeRate[]> {
    const targetDate = date || format(new Date(), "yyyy-MM-dd");

    const rawData = await fetchWithRetry<any>({
      url: `https://www.vietcombank.com.vn/api/exchangerates/exportexcel?date=${targetDate}`,
      method: "GET",
    });

    const base64 = rawData?.Data;
    if (!base64) return [];

    const workbook = XLSX.read(base64, { type: "base64" });
    const sheetName = "ExchangeRate";
    const sheet = workbook.Sheets[sheetName] || workbook.Sheets[workbook.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
    const columns = ["CurrencyCode", "CurrencyName", "Buy Cash", "Buy Transfer", "Sell"];

    const dataWithColumns = rawRows
      .slice(1)
      .map((row: any) => {
        const rowObject: Record<string, any> = {};
        columns.forEach((col, index) => {
          rowObject[col] = row[index] || null;
        });
        return rowObject;
      })
      .filter((row: any) => row.CurrencyName !== null);

    return dataWithColumns.map(
      (row: any) => applyTransform(row, exchangeRateTransformConfig) as unknown as ExchangeRate
    );
  }
}
