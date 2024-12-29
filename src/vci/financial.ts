import axios from "axios";
import { GRAPHQL_URL, PERIOD_MAP, REPORT_NAME, SUPPORTED_LANGUAGES, UNIT_MAP } from "./const";
import { IFinancialRatio } from "./model";

export default class Financials {
  constructor() {}

  /**
   * @function balanceSheet
   * @description Fetches the financial report of balance sheet of a given stock symbol.
   * @param {Object} options - The options object.
   * @param {string} options.symbol - The stock symbol.
   * @param {string} [options.period=quarter] - The period of the report. Supports "year" or "quarter".
   * @param {string} [options.lang=en] - The language of the report. Supports "vi" or "en".
   * @returns {Promise<IFinancialRatio>} - The balance sheet report data.
   */
  async balanceSheet({ symbol, period = "quarter", lang = "en" }: { symbol: string; period?: string; lang?: string }) {
    return this.processReport({ reportKey: "Chỉ tiêu cân đối kế toán", symbol, period, lang });
  }

  /**
   * @function incomeStatement
   * @description Fetches the financial report of income statement of a given stock symbol.
   * @param {Object} options - The options object.
   * @param {string} options.symbol - The stock symbol.
   * @param {string} [options.period=quarter] - The period of the report. Supports "year" or "quarter".
   * @param {string} [options.lang=en] - The language of the report. Supports "vi" or "en".
   * @returns {Promise<IFinancialRatio>} - The income statement report data.
   */
  async incomeStatement({ symbol, period = "quarter", lang = "en" }: { symbol: string; period?: string; lang?: string }) {
    return this.processReport({ reportKey: "Chỉ tiêu kết quả kinh doanh", symbol, period, lang });
  }

  /**
   * @function cashFlow
   * @description Fetches the financial report of cash flow statement of a given stock symbol.
   * @param {Object} options - The options object.
   * @param {string} options.symbol - The stock symbol.
   * @param {string} [options.period=quarter] - The period of the report. Supports "year" or "quarter".
   * @param {string} [options.lang=en] - The language of the report. Supports "vi" or "en".
   * @returns {Promise<IFinancialRatio>} - The cash flow statement report data.
   */
  async cashFlow({ symbol, period = "quarter", lang = "en" }: { symbol: string; period?: string; lang?: string }) {
    return this.processReport({ reportKey: "Chỉ tiêu lưu chuyển tiền tệ", symbol, period, lang });
  }

  /**
   * @function processReport
   * @description Processes the report data from VCI.
   * @param {Object} options - The options object.
   * @param {string} options.reportKey - The key of the report.
   * @param {string} options.symbol - The stock symbol.
   * @param {string} [options.period=quarter] - The period of the report. Supports "year" or "quarter".
   * @param {string} [options.lang=en] - The language of the report. Supports "vi" or "en".
   * @returns {Promise<IFinancialRatio>} - The processed report data.
   * @private
   */
  private async processReport({ reportKey, symbol, period = "quarter", lang = "en" }: { reportKey: string; symbol: string; period?: string; lang: string }) {
    this.inputValidation({ reportKey, period, lang });
    return this.getReport({ reportKey, symbol, period, lang });
  }

  /**
   * Fetches the financial report data using a GraphQL query for a given stock symbol.
   *
   * @param {Object} options - The options object.
   * @param {string} options.reportKey - The key of the report to fetch.
   * @param {string} options.symbol - The stock symbol.
   * @param {string} [options.period=quarter] - The period of the report. Supports "year" or "quarter".
   * @param {string} [options.lang=en] - The language of the report. Supports "vi" or "en".
   * @returns {Promise<Object>} - A promise that resolves to an object containing the financial ratio data
   *                              and its corresponding mapping.
   * @throws {Error} - Throws an error if fetching the report data fails.
   * @private
   */
  private async getReport({ reportKey, symbol, period = "quarter", lang = "en" }: { reportKey: string; symbol: string; period?: string; lang?: string }) {
    const url = GRAPHQL_URL;
    const payload = {
      variables: { ticker: symbol, period: PERIOD_MAP[period as keyof typeof PERIOD_MAP] },
      query:
        "fragment Ratios on CompanyFinancialRatio {\n  ticker\n  yearReport\n  lengthReport\n  updateDate\n  revenue\n  revenueGrowth\n  netProfit\n  netProfitGrowth\n  ebitMargin\n  roe\n  roic\n  roa\n  pe\n  pb\n  eps\n  currentRatio\n  cashRatio\n  quickRatio\n  interestCoverage\n  ae\n  netProfitMargin\n  grossMargin\n  ev\n  issueShare\n  ps\n  pcf\n  bvps\n  evPerEbitda\n  BSA1\n  BSA2\n  BSA5\n  BSA8\n  BSA10\n  BSA159\n  BSA16\n  BSA22\n  BSA23\n  BSA24\n  BSA162\n  BSA27\n  BSA29\n  BSA43\n  BSA46\n  BSA50\n  BSA209\n  BSA53\n  BSA54\n  BSA55\n  BSA56\n  BSA58\n  BSA67\n  BSA71\n  BSA173\n  BSA78\n  BSA79\n  BSA80\n  BSA175\n  BSA86\n  BSA90\n  BSA96\n  CFA21\n  CFA22\n  at\n  fat\n  acp\n  dso\n  dpo\n  ccc\n  de\n  le\n  ebitda\n  ebit\n  dividend\n  RTQ10\n  charterCapitalRatio\n  RTQ4\n  epsTTM\n  charterCapital\n  fae\n  RTQ17\n  CFA26\n  CFA6\n  CFA9\n  BSA85\n  CFA36\n  BSB98\n  BSB101\n  BSA89\n  CFA34\n  CFA14\n  ISB34\n  ISB27\n  ISA23\n  ISS152\n  ISA102\n  CFA27\n  CFA12\n  CFA28\n  BSA18\n  BSB102\n  BSB110\n  BSB108\n  CFA23\n  ISB41\n  BSB103\n  BSA40\n  BSB99\n  CFA16\n  CFA18\n  CFA3\n  ISB30\n  BSA33\n  ISB29\n  CFS200\n  ISA2\n  CFA24\n  BSB105\n  CFA37\n  ISS141\n  BSA95\n  CFA10\n  ISA4\n  BSA82\n  CFA25\n  BSB111\n  ISI64\n  BSB117\n  ISA20\n  CFA19\n  ISA6\n  ISA3\n  BSB100\n  ISB31\n  ISB38\n  ISB26\n  BSA210\n  CFA20\n  CFA35\n  ISA17\n  ISS148\n  BSB115\n  ISA9\n  CFA4\n  ISA7\n  CFA5\n  ISA22\n  CFA8\n  CFA33\n  CFA29\n  BSA30\n  BSA84\n  BSA44\n  BSB107\n  ISB37\n  ISA8\n  BSB109\n  ISA19\n  ISB36\n  ISA13\n  ISA1\n  BSB121\n  ISA14\n  BSB112\n  ISA21\n  ISA10\n  CFA11\n  ISA12\n  BSA15\n  BSB104\n  BSA92\n  BSB106\n  BSA94\n  ISA18\n  CFA17\n  ISI87\n  BSB114\n  ISA15\n  BSB116\n  ISB28\n  BSB97\n  CFA15\n  ISA11\n  ISB33\n  BSA47\n  ISB40\n  ISB39\n  CFA7\n  CFA13\n  ISS146\n  ISB25\n  BSA45\n  BSB118\n  CFA1\n  CFS191\n  ISB35\n  CFB65\n  CFA31\n  BSB113\n  ISB32\n  ISA16\n  CFS210\n  BSA48\n  BSA36\n  ISI97\n  CFA30\n  CFA2\n  CFB80\n  CFA38\n  CFA32\n  ISA5\n  BSA49\n  CFB64\n  __typename\n}\n\nquery Query($ticker: String!, $period: String!) {\n  CompanyFinancialRatio(ticker: $ticker, period: $period) {\n    ratio {\n      ...Ratios\n      __typename\n    }\n    period\n    __typename\n  }\n}\n",
    };
    try {
      const response = await axios.post(url, payload);
      if (response.status !== 200) {
        throw new Error(`Error fetching data: ${response.status} - ${JSON.stringify(response.data)}`);
      }
      const { data } = response.data as { data: { CompanyFinancialRatio: { ratio: any[]; period: string[]; __typename: string } } };
      const ratioMapping = await this.getRatioMapping();
      return { data: data.CompanyFinancialRatio, mapping: { ratio: ratioMapping.find((r) => r.type === reportKey), unit: UNIT_MAP } };
    } catch (error: any) {
      throw new Error(`An error occurred while fetching report data: ${error.message}`);
    }
  }

  /**
   * Fetches the mapping of financial ratios
   *
   * @returns an array of objects, each containing the type of the ratio and an array of fields for that type
   * @throws an error if the request fails or if there's an issue with the response
   */
  private async getRatioMapping() {
    const url = GRAPHQL_URL;
    const payload = {
      variables: {},
      query:
        "query Query {\n  ListFinancialRatio {\n    id\n    type\n    name\n    unit\n    isDefault\n    fieldName\n    en_Type\n    en_Name\n    tagName\n    comTypeCode\n    order\n    __typename\n  }\n}\n",
    };
    try {
      const response = await axios.post(url, payload);
      if (response.status !== 200) {
        throw new Error(`Error fetching data: ${response.status} - ${JSON.stringify(response.data)}`);
      }
      const { data } = response.data as { data: { ListFinancialRatio: IFinancialRatio[] } };
      const result = data.ListFinancialRatio.reduce<{ type: string; fields: IFinancialRatio[] }[]>((acc, item) => {
        let group = acc.find((g) => g.type === item.type);
        if (!group) {
          group = { type: item.type, fields: [] };
          acc.push(group);
        }
        group.fields.push(item);
        return acc;
      }, []);
      return result;
    } catch (error: any) {
      throw new Error(`An error occurred while fetching ratio mapping data: ${error.message}`);
    }
  }

  /**
   * Validates the input parameters.
   * @throws an error if the reportKey is invalid
   * @throws an error if the period is invalid
   * @throws an error if the language is invalid
   * @param {{ reportKey: string, period?: string, lang?: string }} input - the input object
   * @private
   */
  private inputValidation({ reportKey, period, lang }: { reportKey: string; period?: string; lang?: string }) {
    if (!REPORT_NAME.includes(reportKey)) {
      throw new Error("Báo cáo không hợp lệ. Chỉ chấp nhận 'Chỉ tiêu kết quả kinh doanh', 'Chỉ tiêu cân đối kế toán', 'Chỉ tiêu lưu chuyển tiền tệ'.");
    }
    if (period) {
      if (!(period in PERIOD_MAP)) {
        throw new Error(`Invalid period ${period}, it should be one of ${Object.keys(PERIOD_MAP).join(", ")}`);
      }
    }
    if (lang) {
      if (!SUPPORTED_LANGUAGES.includes(lang)) {
        throw new Error(`Invalid language ${lang}, it should be one of ${SUPPORTED_LANGUAGES.join(", ")}`);
      }
    }
  }
}
