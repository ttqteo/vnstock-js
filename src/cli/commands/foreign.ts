import vnstock from "../../";
import { renderJson } from "../renderers/json";
import { renderCsv } from "../renderers/csv";
import { compactNumber } from "../format/number";
import { priceColor, bold, dim } from "../format/color";
import { formatTy, normalizeExchange } from "./market";

export const meta = { requiresData: false };

export interface ForeignOpts {
  symbol?: string;
  exchange: string;
  top: number;
  json: boolean;
  csv: boolean;
  color: boolean;
  quiet: boolean;
  verbose: boolean;
}

export async function handleForeign(opts: ForeignOpts): Promise<string> {
  if (opts.symbol) return renderSymbol(opts);
  return renderMarket(opts);
}

async function renderSymbol(opts: ForeignOpts): Promise<string> {
  var symbol = String(opts.symbol).toUpperCase().trim();
  var flow = await vnstock.stock.foreignFlow(symbol);

  if (opts.json) return renderJson(flow);
  if (opts.csv) return renderCsv([flow as any]);

  var line1 = bold(flow.symbol, opts) + dim(" · " + flow.date, opts);
  var line2 =
    dim("Ròng ", opts) +
    priceColor(flow.netValue, (flow.netValue >= 0 ? "+" : "") + formatTy(flow.netValue), opts) +
    dim("  mua " + formatTy(flow.buyValue) + " · bán " + formatTy(flow.sellValue), opts);
  var line3 =
    dim("KL mua/bán ", opts) +
    compactNumber(flow.buyVolume) +
    "/" +
    compactNumber(flow.sellVolume) +
    dim("  ròng " + compactNumber(flow.netVolume), opts);

  return [line1, line2, line3].join("\n");
}

async function renderMarket(opts: ForeignOpts): Promise<string> {
  var exchange = normalizeExchange(opts.exchange);
  var flow = await vnstock.market.foreignFlow({ exchange: exchange as any, top: opts.top });

  if (opts.json) return renderJson(flow);
  if (opts.csv) return renderCsv(flow.topNetBuy.concat(flow.topNetSell) as any[]);

  var line1 =
    bold(flow.exchange, opts) +
    dim(" · " + flow.date, opts) +
    "  " +
    priceColor(flow.netValue, (flow.netValue >= 0 ? "+" : "") + formatTy(flow.netValue), opts) +
    dim("  mua " + formatTy(flow.buyValue) + " · bán " + formatTy(flow.sellValue), opts);

  var out = [line1, ""];
  out.push(dim("Top mua ròng", opts));
  out.push(flow.topNetBuy.length === 0 ? dim("  (không có)", opts) : flow.topNetBuy.map(row(opts)).join("\n"));
  out.push("");
  out.push(dim("Top bán ròng", opts));
  out.push(flow.topNetSell.length === 0 ? dim("  (không có)", opts) : flow.topNetSell.map(row(opts)).join("\n"));

  // The upstream exposes no per-day history, so say it rather than let a reader
  // assume this is cumulative.
  out.push("");
  out.push(dim("Chỉ phiên hiện tại. Nguồn không cung cấp lịch sử khối ngoại theo ngày.", opts));

  return out.join("\n");
}

function row(opts: ForeignOpts) {
  return function (f: { symbol: string; netValue: number; buyValue: number; sellValue: number }): string {
    return (
      "  " +
      f.symbol.padEnd(6) +
      priceColor(f.netValue, ((f.netValue >= 0 ? "+" : "") + f.netValue.toFixed(1)).padStart(9), opts) +
      dim("  mua " + f.buyValue.toFixed(1) + " · bán " + f.sellValue.toFixed(1), opts)
    );
  };
}
