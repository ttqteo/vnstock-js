import { fetchWithRetry } from "../../pipeline/fetch";
import { applyTransform } from "../../pipeline/transform";
import { financialTransformConfig } from "../../pipeline/transform/configs/financial";
import { GRAPHQL_URL, PERIOD_MAP, REPORT_NAME, SUPPORTED_LANGUAGES } from "../../shared/constants";

export interface FinancialResult {
  data: Record<string, unknown>;
  mapping: {
    ratio: any;
    unit: any;
  };
}

export default class Financials {
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

    const [reportData, mappingData] = await Promise.all([
      this.getReport(symbol, period),
      this.getRatioMapping(),
    ]);

    const ratio = reportData.CompanyFinancialRatio?.ratio || {};
    const normalizedRatio = applyTransform(
      { ticker: symbol, ...ratio },
      financialTransformConfig
    );

    const mapping = mappingData.find((m: any) => m.type === reportKey);

    return {
      data: normalizedRatio,
      mapping: {
        ratio: mapping || {},
        unit: { BILLION: "billion", PERCENT: "%", INDEX: "index", MILLION: "million" },
      },
    };
  }

  private async getReport(symbol: string, period: string): Promise<any> {
    const periodCode = PERIOD_MAP[period as keyof typeof PERIOD_MAP];
    const query = `query CompanyFinancialRatio($ticker: String!, $period: String!) {
      CompanyFinancialRatio(ticker: $ticker, period: $period) {
        ratio { ticker yearReport lengthReport updateDate revenue revenueGrowth netProfit netProfitGrowth roe roic roa pe pb eps currentRatio cashRatio quickRatio interestCoverage ae fae netProfitMargin grossMargin ev issueShare ps pcf bvps evPerEbitda at fat acp dso dpo ccc de le ebitda ebit dividend RTQ4 charterCapital RTQ10 RTQ17 charterCapitalRatio epsTTM }
        period
      }
    }`;

    const response = await fetchWithRetry<any>({
      url: GRAPHQL_URL,
      method: "POST",
      data: {
        query,
        variables: { ticker: symbol, period: periodCode },
      },
    });

    return response.data;
  }

  private async getRatioMapping(): Promise<any[]> {
    const query = `query ListFinancialRatio {
      ListFinancialRatio { id type name unit isDefault fieldName en_Type en_Name tagName comTypeCode order }
    }`;

    const response = await fetchWithRetry<any>({
      url: GRAPHQL_URL,
      method: "POST",
      data: { query },
    });

    const ratios = response.data?.ListFinancialRatio || [];
    const grouped: Record<string, any> = {};

    for (const r of ratios) {
      if (!grouped[r.type]) {
        grouped[r.type] = { type: r.type, fields: [] };
      }
      grouped[r.type].fields.push(r);
    }

    return Object.values(grouped);
  }

  private validate(reportKey: string, period: string, lang: string): void {
    if (!REPORT_NAME.includes(reportKey)) {
      throw new Error(`Invalid report key: ${reportKey}`);
    }
    if (!PERIOD_MAP[period as keyof typeof PERIOD_MAP]) {
      throw new Error(`Invalid period: ${period}. Use "quarter" or "year"`);
    }
    if (!SUPPORTED_LANGUAGES.includes(lang)) {
      throw new Error(`Invalid language: ${lang}. Use "vi" or "en"`);
    }
  }
}
