import { parse } from "date-fns";
import { fetchWithRetry } from "../../pipeline/fetch";
import { transformQuoteHistory, QuoteHistory } from "../../pipeline/transform/configs/quote";
import { CHART_URL, INTERVAL_MAP } from "../../shared/constants";
import { validateDateFormat, inputValidation } from "../../shared/utils";

export default class Quote {
  async history(options: {
    symbols: string[];
    start: string;
    end?: string;
    timeFrame: string;
    countBack?: number;
  }): Promise<QuoteHistory[]> {
    const { symbols, start, end, timeFrame, countBack = 365 } = options;

    inputValidation(timeFrame);
    validateDateFormat([start, ...(end ? [end] : [])]);

    const mappedTimeFrame = INTERVAL_MAP[timeFrame as keyof typeof INTERVAL_MAP];
    const from = parse(start, "yyyy-MM-dd", new Date()).getTime() / 1000;
    const now = new Date();
    now.setDate(now.getDate() + 2);
    const to = end
      ? parse(end, "yyyy-MM-dd", new Date()).getTime() / 1000
      : Math.floor(now.getTime() / 1000);

    if (from > to) {
      throw new Error("Start date must be before end date");
    }

    const rawData = await fetchWithRetry<any[]>({
      url: CHART_URL,
      method: "POST",
      data: {
        symbols,
        from,
        to,
        timeFrame: mappedTimeFrame,
        countBack,
      },
    });

    const results: QuoteHistory[] = [];
    for (const chartData of rawData) {
      results.push(...transformQuoteHistory(chartData));
    }

    return results;
  }
}
