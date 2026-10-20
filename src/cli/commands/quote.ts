import type { Client } from "../../client";
import type { Quote } from "../../types";
import { renderJson } from "../renderers/json";
import { renderCsv } from "../renderers/csv";
import { formatPercent, compactNumber } from "../format/number";
import { price } from "../format/money";
import { priceColor, bold, dim } from "../format/color";

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
  var pad = function (n: number) {
    return n < 10 ? "0" + n : String(n);
  };
  return now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate()) + " " + pad(now.getHours()) + ":" + pad(now.getMinutes());
}

function renderOneQuote(q: Quote, ts: string, opts: QuoteOpts): string {
  var priceStr = priceColor(q.change, price(q.price), opts);
  var pctStr = priceColor(q.change, formatPercent(q.changePct), opts);

  var line1 = bold(q.symbol, opts) + "  " + q.name + dim(" · " + q.exchange, opts) + dim("  · " + ts, opts);
  var parts: string[] = [];
  parts.push(priceStr);
  parts.push(pctStr);
  parts.push(dim("KL " + compactNumber(q.volume), opts));
  parts.push(dim("Trần/Sàn " + price(q.ceiling) + "/" + price(q.floor), opts));
  var line2 = parts.join("  ");

  if (!opts.verbose) return line1 + "\n" + line2;

  var line3 =
    dim("Cao/Thấp ", opts) +
    price(q.high) +
    "/" +
    price(q.low) +
    "  " +
    dim("NN Mua/Bán ", opts) +
    compactNumber(q.foreignBuyVolume) +
    "/" +
    compactNumber(q.foreignSellVolume);
  return line1 + "\n" + line2 + "\n" + line3;
}

export async function handleQuote(client: Client, opts: QuoteOpts): Promise<string> {
  var symbols = opts.symbol
    .split(",")
    .map(function (s) {
      return s.trim().toUpperCase();
    })
    .filter(function (s) {
      return s.length > 0;
    });

  if (symbols.length === 0) {
    throw new Error("No symbol provided");
  }

  var result = (await client.prices(symbols)).filter(function (q) {
    return q && q.symbol;
  });
  if (result.length === 0) {
    throw new Error("Symbol(s) not found: " + symbols.join(","));
  }

  if (opts.json) return renderJson(symbols.length === 1 ? result[0] : result);
  if (opts.csv) return renderCsv(result as any[]);

  var ts = timestampNow();
  return result
    .map(function (q) {
      return renderOneQuote(q, ts, opts);
    })
    .join("\n\n");
}
