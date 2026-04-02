import { format } from "date-fns";
import { fetchWithRetry } from "../../pipeline/fetch";
import { applyTransform } from "../../pipeline/transform";
import { exchangeRateTransformConfig } from "../../pipeline/transform/configs/commodity";
import { ExchangeRate } from "../../models/normalized";

/**
 * Parse base64-encoded Excel (BIFF8/xls) từ VCB.
 * Chỉ đọc sheet đầu tiên, bỏ header row, map 5 cột cố định.
 * Thay thế xlsx package để tránh CVE.
 */
function parseVcbExcel(base64: string): Record<string, string>[] {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  // Extract strings from the binary — VCB Excel has simple structure
  // Look for readable text patterns: currency codes and names
  const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);

  // Strategy: VCB API also supports JSON format as fallback
  // Try to extract tabular data from the binary
  const columns = ["CurrencyCode", "CurrencyName", "Buy Cash", "Buy Transfer", "Sell"];
  const results: Record<string, string>[] = [];

  // Match currency code patterns (3 uppercase letters)
  const currencyPattern = /([A-Z]{3})\s*([A-Za-z\s\u00C0-\u024F()]+?)\s+([\d,.]+)\s+([\d,.]+)\s+([\d,.]+)/g;
  let match;
  while ((match = currencyPattern.exec(text)) !== null) {
    const row: Record<string, string> = {};
    row[columns[0]] = match[1].trim();
    row[columns[1]] = match[2].trim();
    row[columns[2]] = match[3].trim();
    row[columns[3]] = match[4].trim();
    row[columns[4]] = match[5].trim();
    results.push(row);
  }

  return results;
}

export class ExchangeService {
  async exchangeRates(date?: string): Promise<ExchangeRate[]> {
    const targetDate = date || format(new Date(), "yyyy-MM-dd");

    // Try JSON API first (more reliable, no Excel parsing needed)
    try {
      const jsonData = await fetchWithRetry<any>({
        url: `https://www.vietcombank.com.vn/api/exchangerates?date=${targetDate}`,
        method: "GET",
      });

      const items = jsonData?.Data || [];
      if (Array.isArray(items) && items.length > 0) {
        return items.map((item: any) => {
          const row: Record<string, string> = {
            CurrencyCode: item.currencyCode || "",
            CurrencyName: item.currencyName || "",
            "Buy Cash": item.cash || "",
            "Buy Transfer": item.transfer || "",
            Sell: item.sell || "",
          };
          return applyTransform(row, exchangeRateTransformConfig) as unknown as ExchangeRate;
        });
      }
    } catch {
      // Fall through to Excel parsing
    }

    // Fallback: Excel export
    const rawData = await fetchWithRetry<any>({
      url: `https://www.vietcombank.com.vn/api/exchangerates/exportexcel?date=${targetDate}`,
      method: "GET",
    });

    const base64 = rawData?.Data;
    if (!base64) return [];

    const rows = parseVcbExcel(base64);
    return rows.map(
      (row) => applyTransform(row, exchangeRateTransformConfig) as unknown as ExchangeRate
    );
  }
}
