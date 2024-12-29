export default class Financials {
  constructor() {}

  async balanceSheet({ symbol, period = "quarter", lang = "en" }: { symbol: string; period?: string; lang?: string }) {
    // TODO: Implement this method
    return Promise.reject(new Error("Currently this not implemented"));
  }

  async incomeStatement({ symbol, period = "quarter", lang = "en" }: { symbol: string; period?: string; lang?: string }) {
    // TODO: Implement this method
    return Promise.reject(new Error("Currently this not implemented"));
  }

  async cashFlow({ symbol, period = "quarter", lang = "en" }: { symbol: string; period?: string; lang?: string }) {
    // TODO: Implement this method
    return Promise.reject(new Error("Currently this not implemented"));
  }
}
