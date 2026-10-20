export const headers = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9,vi-VN;q=0.8,vi;q=0.7",
  "Content-Type": "application/json",
  Connection: "keep-alive",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  DNT: "1",
  Origin: "https://trading.vietcap.com.vn",
  Referer: "https://trading.vietcap.com.vn/",
};

export const BASE_URL = "https://trading.vietcap.com.vn";
export const VCI_HANDSHAKE_URL = BASE_URL + "/priceboard";
export const CHART_URL = BASE_URL + "/api/chart/OHLCChart/gap-chart";
export const ALL_SYMBOLS_URL = "https://ai.vietcap.com.vn/api/get_all_tickers";

export const VCI_IQ_URL = "https://iq.vietcap.com.vn/api/iq-insight-service";
export const VCI_COMPANY_URL = VCI_IQ_URL + "/v1/company";
export const VCI_EVENTS_URL = VCI_IQ_URL + "/v1/events";
export const VCI_NEWS_URL = VCI_IQ_URL + "/v1/news";

export const PERIOD_MAP = { year: "Y", quarter: "Q" };
export const INDEX_SYMBOLS = ["VNINDEX", "VN30", "VN100", "HNXIndex", "HNX30", "HNXUpcomIndex"];
