import { QuoteHistory } from "../models/normalized";

export interface IchimokuOptions {
  tenkan?: number;
  kijun?: number;
  senkou?: number;
  displacement?: number;
}

export interface IchimokuResult {
  date: string;
  tenkanSen: number | null;
  kijunSen: number | null;
  senkouSpanA: number | null;
  senkouSpanB: number | null;
  chikouSpan: number | null;
  cloudTop: number | null;
  cloudBottom: number | null;
}

function donchian(data: QuoteHistory[], end: number, period: number): number | null {
  if (end + 1 < period) return null;
  var hi = -Infinity;
  var lo = Infinity;
  for (var j = end - period + 1; j <= end; j++) {
    if (data[j].high > hi) hi = data[j].high;
    if (data[j].low < lo) lo = data[j].low;
  }
  return (hi + lo) / 2;
}

export function ichimoku(
  data: QuoteHistory[],
  options: IchimokuOptions = {}
): IchimokuResult[] {
  var tenkanP = options.tenkan == null ? 9 : options.tenkan;
  var kijunP = options.kijun == null ? 26 : options.kijun;
  var senkouP = options.senkou == null ? 52 : options.senkou;
  var displacement = options.displacement == null ? 26 : options.displacement;

  if (tenkanP < 1 || kijunP < 1 || senkouP < 1 || displacement < 1) {
    throw new Error("Period must be >= 1");
  }
  if (data.length === 0) return [];

  var n = data.length;
  var results: IchimokuResult[] = new Array(n);

  var tenkanArr: (number | null)[] = new Array(n);
  var kijunArr: (number | null)[] = new Array(n);
  var senkouBRawArr: (number | null)[] = new Array(n);

  for (var i = 0; i < n; i++) {
    tenkanArr[i] = donchian(data, i, tenkanP);
    kijunArr[i] = donchian(data, i, kijunP);
    senkouBRawArr[i] = donchian(data, i, senkouP);
  }

  for (var k = 0; k < n; k++) {
    var src = k - displacement;
    var spanA: number | null = null;
    var spanB: number | null = null;
    if (src >= 0) {
      var t = tenkanArr[src];
      var kj = kijunArr[src];
      if (t !== null && kj !== null) spanA = (t + kj) / 2;
      spanB = senkouBRawArr[src];
    }

    var chikou: number | null = null;
    var chikouIdx = k + displacement;
    if (chikouIdx < n) chikou = data[chikouIdx].close;

    var top: number | null = null;
    var bot: number | null = null;
    if (spanA !== null && spanB !== null) {
      top = spanA > spanB ? spanA : spanB;
      bot = spanA < spanB ? spanA : spanB;
    }

    results[k] = {
      date: data[k].date,
      tenkanSen: tenkanArr[k],
      kijunSen: kijunArr[k],
      senkouSpanA: spanA,
      senkouSpanB: spanB,
      chikouSpan: chikou,
      cloudTop: top,
      cloudBottom: bot,
    };
  }

  return results;
}
