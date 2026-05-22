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

function timestampNow(): string {
  var now = new Date();
  var pad = function (n: number) { return n < 10 ? "0" + n : String(n); };
  return (
    now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate()) +
    " " + pad(now.getHours()) + ":" + pad(now.getMinutes())
  );
}

function renderOneQuote(pb: any, ts: string, opts: QuoteOpts): string {
  var change = pb.price - pb.referencePrice;
  var changePct = pb.referencePrice > 0 ? (change / pb.referencePrice) * 100 : 0;
  var priceStr = priceColor(change, formatPrice(pb.price), opts);
  var pctStr = priceColor(change, formatPercent(changePct), opts);

  var line1 =
    bold(pb.symbol, opts) +
    "  " +
    pb.companyName +
    dim(" · " + pb.exchange, opts) +
    dim("  · " + ts, opts);
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

export async function handleQuote(opts: QuoteOpts): Promise<string> {
  var symbols = opts.symbol
    .split(",")
    .map(function (s) { return s.trim().toUpperCase(); })
    .filter(function (s) { return s.length > 0; });

  if (symbols.length === 0) {
    throw new Error("No symbol provided");
  }

  var result = await vnstock.stock.trading.priceBoard(symbols);
  if (!result || result.length === 0) {
    throw new Error("Symbol(s) not found: " + symbols.join(","));
  }

  if (opts.json) return renderJson(symbols.length === 1 ? result[0] : result);
  if (opts.csv) return renderCsv(result as any[]);

  var ts = timestampNow();
  var blocks = result.map(function (pb: any) { return renderOneQuote(pb, ts, opts); });
  return blocks.join("\n\n");
}
