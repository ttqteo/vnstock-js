import { format, fromUnixTime } from "date-fns";
import { TransformConfig } from "../../types";

export const quoteTransformConfig: TransformConfig = {
  fieldMap: {
    o: "open",
    h: "high",
    l: "low",
    c: "close",
    v: "volume",
    t: "date",
  },
  priceFields: ["open", "high", "low", "close"],
  dateFields: ["date"],
  percentFields: [],
};

export interface QuoteHistory {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function transformQuoteHistory(raw: {
  o: number[];
  h: number[];
  l: number[];
  c: number[];
  v: number[];
  t: number[];
  [key: string]: unknown;
}): QuoteHistory[] {
  const length = raw.t?.length ?? 0;
  const result: QuoteHistory[] = [];

  for (let i = 0; i < length; i++) {
    result.push({
      date: format(fromUnixTime(raw.t[i]), "yyyy-MM-dd"),
      open: raw.o[i] / 1000,
      high: raw.h[i] / 1000,
      low: raw.l[i] / 1000,
      close: raw.c[i] / 1000,
      volume: raw.v[i],
    });
  }

  return result;
}
