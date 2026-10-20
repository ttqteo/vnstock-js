import type { Client } from "../../client";
import type { Exchange } from "../../types";
import { renderJson } from "../renderers/json";
import { renderCsv } from "../renderers/csv";
import { compactNumber } from "../format/number";
import { money } from "../format/money";
import { priceColor, bold, dim } from "../format/color";

export interface MarketOpts {
  exchange: string;
  index?: string;
  json: boolean;
  csv: boolean;
  color: boolean;
  quiet: boolean;
  verbose: boolean;
}

const EXCHANGES = ["HOSE", "HNX", "UPCOM", "ALL"];

export function normalizeExchange(raw: string | undefined): Exchange | "ALL" {
  var up = String(raw || "HOSE")
    .toUpperCase()
    .trim();
  if (up === "HSX") up = "HOSE";
  if (EXCHANGES.indexOf(up) === -1) {
    throw new Error("Invalid exchange '" + raw + "'. Use one of: " + EXCHANGES.join(", "));
  }
  return up as Exchange | "ALL";
}

/** Signed money for flows: "+1.2 tỷ", "-507.1 tỷ". */
export function signedMoney(dong: number): string {
  return (dong >= 0 ? "+" : "") + money(dong);
}

export async function handleMarket(client: Client, opts: MarketOpts): Promise<string> {
  var exchange = normalizeExchange(opts.exchange);
  var overview = await client.market({ exchange: exchange, index: opts.index });

  if (opts.json) return renderJson(overview);
  if (opts.csv) {
    return renderCsv([
      {
        date: overview.date,
        index: overview.index.symbol,
        close: overview.index.close,
        changePercent: overview.index.changePercent,
        liquidityVND: overview.liquidity.value,
        advancing: overview.breadth.advancing,
        declining: overview.breadth.declining,
        unchanged: overview.breadth.unchanged,
        foreignNetVND: overview.foreign.netValue,
      },
    ]);
  }

  var idx = overview.index;
  var change = idx.change === null ? 0 : idx.change;
  var pct = idx.changePercent === null ? 0 : idx.changePercent;

  var line1 =
    bold(idx.symbol, opts) +
    "  " +
    priceColor(change, idx.close.toFixed(2), opts) +
    "  " +
    priceColor(change, (pct >= 0 ? "+" : "") + pct.toFixed(2) + "%", opts) +
    dim(" · " + overview.date, opts);

  var liq = overview.liquidity;
  var liqDelta =
    liq.changePercent === null ? "" : "  " + priceColor(liq.changePercent, (liq.changePercent >= 0 ? "+" : "") + liq.changePercent.toFixed(1) + "%", opts);
  var line2 = dim("Thanh khoản ", opts) + money(liq.value) + liqDelta;

  var b = overview.breadth;
  var line3 =
    dim("Độ rộng " + b.exchange + " ", opts) +
    priceColor(1, "▲ " + b.advancing, opts) +
    "  " +
    priceColor(-1, "▼ " + b.declining, opts) +
    "  " +
    dim("= " + b.unchanged, opts) +
    dim("  (trần " + b.ceiling + ", sàn " + b.floor + " / " + b.total + " mã)", opts);

  var f = overview.foreign;
  var line4 =
    dim("Khối ngoại ", opts) + priceColor(f.netValue, signedMoney(f.netValue), opts) + dim("  mua " + money(f.buyValue) + " · bán " + money(f.sellValue), opts);

  var out = [line1, line2, line3, line4];

  if (opts.verbose) {
    out.push("");
    out.push(dim("Top mua ròng:  ", opts) + f.topNetBuy.slice(0, 5).map(fmtFlow).join("  "));
    out.push(dim("Top bán ròng:  ", opts) + f.topNetSell.slice(0, 5).map(fmtFlow).join("  "));
    out.push(dim("KL chỉ số " + compactNumber(idx.volume), opts));
  }

  return out.join("\n");
}

function fmtFlow(f: { symbol: string; netValue: number }): string {
  return f.symbol + " " + signedMoney(f.netValue);
}
