import { PriceBoardItem, QuoteHistory } from "../../models/normalized";
import {
  Exchange,
  ForeignFlow,
  IndexSnapshot,
  MarketBreadth,
  MarketForeignFlow,
  MarketLiquidity,
  MarketRegime,
} from "../../models/market";
import { sma } from "../../indicators";

/**
 * priceBoard money fields are in trieu VND, verified against
 * totalVolume x averagePrice (ratio is exactly 1000). Market-level output is in
 * ty VND, so divide by 1000.
 */
function trieuToTy(trieu: number): number {
  return round3(trieu / 1000);
}

/**
 * averagePrice is in nghin VND, so volume x averagePrice is nghin VND.
 * 1 ty VND = 1e6 nghin VND.
 */
function volumeToTy(volume: number, priceInThousands: number): number {
  return round3((volume * priceInThousands) / 1e6);
}

/** Sums of ~1500 floats otherwise surface as 573.4999999999999. */
function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * A symbol with no matched price has not traded, so it is neither up nor down.
 * Counting it as unchanged would inflate the flat bucket with dead listings.
 */
function hasTraded(item: PriceBoardItem): boolean {
  return item.price > 0 && item.referencePrice > 0;
}

export function computeBreadth(
  items: PriceBoardItem[],
  exchange: Exchange | "ALL",
  date: string
): MarketBreadth {
  var advancing = 0;
  var declining = 0;
  var unchanged = 0;
  var ceiling = 0;
  var floor = 0;
  var total = 0;

  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    if (!hasTraded(it)) continue;
    total++;

    if (it.price > it.referencePrice) advancing++;
    else if (it.price < it.referencePrice) declining++;
    else unchanged++;

    if (it.ceilingPrice > 0 && it.price === it.ceilingPrice) ceiling++;
    if (it.floorPrice > 0 && it.price === it.floorPrice) floor++;
  }

  return {
    exchange: exchange,
    date: date,
    advancing: advancing,
    declining: declining,
    unchanged: unchanged,
    ceiling: ceiling,
    floor: floor,
    total: total,
    advanceDeclineRatio: declining > 0 ? round3(advancing / declining) : null,
  };
}

export function computeSymbolForeignFlow(item: PriceBoardItem, date: string): ForeignFlow {
  var price = item.averagePrice > 0 ? item.averagePrice : item.price;
  var buyValue = volumeToTy(item.foreignBuyVolume || 0, price);
  var sellValue = volumeToTy(item.foreignSellVolume || 0, price);

  return {
    symbol: item.symbol,
    date: date,
    buyVolume: item.foreignBuyVolume || 0,
    sellVolume: item.foreignSellVolume || 0,
    netVolume: (item.foreignBuyVolume || 0) - (item.foreignSellVolume || 0),
    buyValue: buyValue,
    sellValue: sellValue,
    netValue: round3(buyValue - sellValue),
    unit: "tyVND",
  };
}

export function computeMarketForeignFlow(
  items: PriceBoardItem[],
  exchange: Exchange | "ALL",
  date: string,
  top: number = 10
): MarketForeignFlow {
  var flows: ForeignFlow[] = [];
  var buyVolume = 0;
  var sellVolume = 0;
  var buyValue = 0;
  var sellValue = 0;

  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    if (!hasTraded(it)) continue;
    if (!it.foreignBuyVolume && !it.foreignSellVolume) continue;

    var flow = computeSymbolForeignFlow(it, date);
    flows.push(flow);
    buyVolume += flow.buyVolume;
    sellVolume += flow.sellVolume;
    buyValue += flow.buyValue;
    sellValue += flow.sellValue;
  }

  var byNetDesc = flows.slice().sort(function (a, b) {
    return b.netValue - a.netValue;
  });

  return {
    exchange: exchange,
    date: date,
    buyVolume: buyVolume,
    sellVolume: sellVolume,
    netVolume: buyVolume - sellVolume,
    buyValue: round3(buyValue),
    sellValue: round3(sellValue),
    netValue: round3(buyValue - sellValue),
    topNetBuy: byNetDesc.filter(positiveNet).slice(0, top),
    topNetSell: byNetDesc
      .filter(negativeNet)
      .slice(-top)
      .reverse(),
    unit: "tyVND",
  };
}

function positiveNet(f: ForeignFlow): boolean {
  return f.netValue > 0;
}

function negativeNet(f: ForeignFlow): boolean {
  return f.netValue < 0;
}

export function toIndexSnapshot(bars: QuoteHistory[], symbol: string): IndexSnapshot {
  if (bars.length === 0) {
    throw new Error(`No index bars available for ${symbol}`);
  }
  var last = bars[bars.length - 1];
  var prev = bars.length > 1 ? bars[bars.length - 2] : null;
  var change = prev ? round3(last.close - prev.close) : null;

  return {
    symbol: symbol,
    date: last.date,
    close: last.close,
    open: last.open,
    high: last.high,
    low: last.low,
    change: change,
    changePercent:
      prev && prev.close !== 0 ? round3(((last.close - prev.close) / prev.close) * 100) : null,
    volume: last.volume,
  };
}

/**
 * QuoteHistory.value is trieu VND (accumulatedValue from VCI, unscaled since
 * v1.4.3). Undefined whenever the upstream omitted it for that bar.
 */
export function computeLiquidity(bars: QuoteHistory[], index: string): MarketLiquidity {
  if (bars.length === 0) {
    throw new Error(`No index bars available for ${index}`);
  }
  var last = bars[bars.length - 1];
  var prev = bars.length > 1 ? bars[bars.length - 2] : null;

  var value = last.value === undefined ? 0 : trieuToTy(last.value);
  var valuePrevious = prev && prev.value !== undefined ? trieuToTy(prev.value) : null;

  return {
    index: index,
    date: last.date,
    value: value,
    valuePrevious: valuePrevious,
    changePercent:
      valuePrevious !== null && valuePrevious !== 0
        ? round3(((value - valuePrevious) / valuePrevious) * 100)
        : null,
    volume: last.volume,
    unit: "tyVND",
  };
}

export function averageLiquidity(bars: QuoteHistory[], period: number = 20): number {
  var vals: number[] = [];
  for (var i = bars.length - 1; i >= 0 && vals.length < period; i--) {
    if (bars[i].value !== undefined) vals.push(bars[i].value as number);
  }
  if (vals.length === 0) return 0;
  var sum = 0;
  for (var j = 0; j < vals.length; j++) sum += vals[j];
  return trieuToTy(sum / vals.length);
}

/**
 * Deliberately the same shape of rule as the per-symbol trend classifier: price
 * against SMA20 and SMA50. An index has no volume-confirmation story worth
 * modelling separately, so keep it simple and explainable.
 */
export function classifyRegime(bars: QuoteHistory[]): {
  regime: MarketRegime;
  rationale: string;
} {
  if (bars.length < 50) {
    return { regime: "sideways", rationale: "Not enough history to classify (need 50 bars)" };
  }

  var sma20 = sma(bars, { period: 20 });
  var sma50 = sma(bars, { period: 50 });
  var last = bars[bars.length - 1].close;
  var s20 = sma20[sma20.length - 1].sma;
  var s50 = sma50[sma50.length - 1].sma;

  if (s20 === null || s50 === null) {
    return { regime: "sideways", rationale: "Moving averages unavailable" };
  }

  if (last > s20 && s20 > s50) {
    return {
      regime: "trending_up",
      rationale: `Close ${last.toFixed(2)} above SMA20 ${s20.toFixed(2)} above SMA50 ${s50.toFixed(2)}`,
    };
  }
  if (last < s20 && s20 < s50) {
    return {
      regime: "trending_down",
      rationale: `Close ${last.toFixed(2)} below SMA20 ${s20.toFixed(2)} below SMA50 ${s50.toFixed(2)}`,
    };
  }
  return {
    regime: "sideways",
    rationale: `Close ${last.toFixed(2)} mixed against SMA20 ${s20.toFixed(2)} and SMA50 ${s50.toFixed(2)}`,
  };
}

export function liquiditySignal(value: number, avg20: number): "above_average" | "below_average" | "normal" {
  if (avg20 === 0) return "normal";
  var ratio = value / avg20;
  if (ratio >= 1.2) return "above_average";
  if (ratio <= 0.8) return "below_average";
  return "normal";
}
