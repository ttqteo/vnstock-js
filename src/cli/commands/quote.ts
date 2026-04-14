import vnstock from "../../";
import { renderJson } from "../renderers/json";
import { renderCsv } from "../renderers/csv";
import { formatPrice, formatPercent, compactNumber } from "../format/number";
import { priceColor, bold, dim } from "../format/color";

export const meta = { requiresData: false };

export interface QuoteOpts {
  symbol: string;
  json: boolean;
  csv: boolean;
  color: boolean;
  quiet: boolean;
  verbose: boolean;
}

export async function handleQuote(opts: QuoteOpts): Promise<string> {
  var symbol = opts.symbol.toUpperCase();
  var result = await vnstock.stock.trading.priceBoard([symbol]);
  if (!result || result.length === 0) {
    throw new Error("Symbol not found: " + symbol);
  }
  var pb = result[0];

  if (opts.json) return renderJson(pb);
  if (opts.csv) return renderCsv([pb as any]);

  var change = pb.price - pb.referencePrice;
  var changePct = pb.referencePrice > 0 ? (change / pb.referencePrice) * 100 : 0;
  var priceStr = priceColor(change, formatPrice(pb.price), opts);
  var pctStr = priceColor(change, formatPercent(changePct), opts);

  var line1 = bold(pb.symbol, opts) + "  " + pb.companyName + dim(" · " + pb.exchange, opts);
  var parts: string[] = [];
  parts.push(priceStr);
  parts.push(pctStr);
  parts.push(dim("KL " + compactNumber(pb.totalVolume), opts));
  parts.push(dim("Trần/Sàn " + formatPrice(pb.ceilingPrice) + "/" + formatPrice(pb.floorPrice), opts));
  var line2 = parts.join("  ");

  if (!opts.verbose) return line1 + "\n" + line2;

  var line3 =
    dim("Cao/Thấp ", opts) +
    formatPrice(pb.highestPrice) +
    "/" +
    formatPrice(pb.lowestPrice) +
    "  " +
    dim("NN Mua/Bán ", opts) +
    compactNumber(pb.foreignBuyVolume) +
    "/" +
    compactNumber(pb.foreignSellVolume);
  return line1 + "\n" + line2 + "\n" + line3;
}
