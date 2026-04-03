import { PERIOD_MAP, REPORT_NAME, SUPPORTED_LANGUAGES } from "../../shared/constants";
import { InvalidParameterError } from "../../errors";
import { StockDataAdapter } from "../../adapters/types";
import { FinancialResult } from "../../adapters/types";

export { FinancialResult };

export default class Financials {
  private adapter: StockDataAdapter;

  constructor(adapter: StockDataAdapter) {
    this.adapter = adapter;
  }

  async balanceSheet(options: {
    symbol: string;
    period?: string;
    lang?: string;
  }): Promise<FinancialResult> {
    return this.processReport({ ...options, reportKey: REPORT_NAME[0] });
  }

  async incomeStatement(options: {
    symbol: string;
    period?: string;
    lang?: string;
  }): Promise<FinancialResult> {
    return this.processReport({ ...options, reportKey: REPORT_NAME[2] });
  }

  async cashFlow(options: {
    symbol: string;
    period?: string;
    lang?: string;
  }): Promise<FinancialResult> {
    return this.processReport({ ...options, reportKey: REPORT_NAME[1] });
  }

  private async processReport(options: {
    symbol: string;
    period?: string;
    lang?: string;
    reportKey: string;
  }): Promise<FinancialResult> {
    const { symbol, period = "quarter", lang = "en", reportKey } = options;
    this.validate(reportKey, period, lang);

    return this.adapter.fetchFinancialReport({ symbol, period, lang, reportKey });
  }

  private validate(reportKey: string, period: string, lang: string): void {
    if (!REPORT_NAME.includes(reportKey)) {
      throw new InvalidParameterError("reportKey", reportKey, REPORT_NAME);
    }
    if (!PERIOD_MAP[period as keyof typeof PERIOD_MAP]) {
      throw new InvalidParameterError("period", period, Object.keys(PERIOD_MAP));
    }
    if (!SUPPORTED_LANGUAGES.includes(lang)) {
      throw new InvalidParameterError("lang", lang, SUPPORTED_LANGUAGES);
    }
  }
}
