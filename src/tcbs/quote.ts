import { IPriceBoard } from "./model";

export default class Quote {
  constructor() {}

  async history({
    symbols,
    start,
    end,
    timeFrame = "1D",
    countBack = 365,
  }: {
    symbols: string[];
    start: string;
    end?: string;
    timeFrame?: string;
    countBack?: number;
  }): Promise<IPriceBoard[]> {
    // TODO: Implement this method
    return Promise.reject(new Error("Currently this not implemented"));
  }
}
