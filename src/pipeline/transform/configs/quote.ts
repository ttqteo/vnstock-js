import { format, fromUnixTime } from "date-fns";
import { TransformConfig } from "../../types";
import { QuoteHistory } from "../../../models/normalized";
import { INDEX_SYMBOLS } from "../../../shared/constants";

export { QuoteHistory };

var INDEX_SYMBOLS_UPPER = INDEX_SYMBOLS.map(function (s) {
  return s.toUpperCase();
});

// Indices are quoted in points, not VND, so the /1000 price convention must not
// apply to them. Matched case-insensitively because the constant list mixes
// casing (VNINDEX vs HNXIndex) and callers pass whatever they typed.
function priceDivisorFor(symbol: string | undefined): number {
  if (!symbol) return 1000;
  return INDEX_SYMBOLS_UPPER.indexOf(symbol.toUpperCase()) !== -1 ? 1 : 1000;
}

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

export function transformQuoteHistory(raw: {
  symbol?: string;
  o: number[];
  h: number[];
  l: number[];
  c: number[];
  v: number[];
  t: number[];
  accumulatedValue?: number[];
  [key: string]: unknown;
}): QuoteHistory[] {
  const length = raw.t?.length ?? 0;
  const result: QuoteHistory[] = [];
  var divisor = priceDivisorFor(raw.symbol);

  for (let i = 0; i < length; i++) {
    result.push({
      symbol: raw.symbol,
      date: format(fromUnixTime(raw.t[i]), "yyyy-MM-dd"),
      open: raw.o[i] / divisor,
      high: raw.h[i] / divisor,
      low: raw.l[i] / divisor,
      close: raw.c[i] / divisor,
      volume: raw.v[i],
      value: raw.accumulatedValue?.[i],
    });
  }

  return result;
}
