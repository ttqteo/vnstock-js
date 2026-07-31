import vnstock from "../../";
import { renderJson } from "../renderers/json";
import { renderCsv } from "../renderers/csv";
import { compactNumber } from "../format/number";
import { priceColor, bold, dim } from "../format/color";

export const meta = { requiresData: false };

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

export function normalizeExchange(raw: string | undefined): string {
  var up = String(raw || "HOSE").toUpperCase().trim();
  if (up === "HSX") up = "HOSE";
  if (EXCHANGES.indexOf(up) === -1) {
    throw new Error("Invalid exchange '" + raw + "'. Use one of: " + EXCHANGES.join(", "));
  }
  return up;
}

/** Ty VND reads better as "12.3k ty" once past a few thousand. */
export function formatTy(value: number): string {
  var abs = Math.abs(value);
  if (abs >= 1000) return (value / 1000).toFixed(2) + "k tỷ";
  return value.toFixed(1) + " tỷ";
}

export async function handleMarket(opts: MarketOpts): Promise<string> {
  var exchange = normalizeExchange(opts.exchange);
  var overview = await vnstock.market.overview({
    exchange: exchange as any,
    index: opts.index,
  });

  if (opts.json) return renderJson(overview);
  if (opts.csv) {
    return renderCsv([
      {
        date: overview.date,
        index: overview.index.symbol,
        close: overview.index.close,
        changePercent: overview.index.changePercent,
        liquidityTyVND: overview.liquidity.value,
        advancing: overview.breadth.advancing,
        declining: overview.breadth.declining,
        unchanged: overview.breadth.unchanged,
        foreignNetTyVND: overview.foreign.netValue,
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
    liq.changePercent === null
      ? ""
      : "  " + priceColor(liq.changePercent, (liq.changePercent >= 0 ? "+" : "") + liq.changePercent.toFixed(1) + "%", opts);
  var line2 = dim("Thanh khoản ", opts) + formatTy(liq.value) + liqDelta;

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
    dim("Khối ngoại ", opts) +
    priceColor(f.netValue, (f.netValue >= 0 ? "+" : "") + formatTy(f.netValue), opts) +
    dim("  mua " + formatTy(f.buyValue) + " · bán " + formatTy(f.sellValue), opts);

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
  return f.symbol + " " + (f.netValue >= 0 ? "+" : "") + f.netValue.toFixed(0);
}
