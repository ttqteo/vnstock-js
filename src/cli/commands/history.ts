import vnstock from "../../";
import { renderJson } from "../renderers/json";
import { renderCsv } from "../renderers/csv";
import { renderTable } from "../renderers/table";
import { parseDateInput, todayISO, nowVN } from "../format/date";
import { formatPrice, formatPercent, compactNumber } from "../format/number";
import { priceColor } from "../format/color";

export const meta = { requiresData: false };

export interface HistoryOpts {
  symbol: string;
  from?: string;
  to?: string;
  range?: string;
  limit?: number;
  json: boolean;
  csv: boolean;
  color: boolean;
  quiet: boolean;
  verbose: boolean;
}

export async function handleHistory(opts: HistoryOpts): Promise<string> {
  var symbol = opts.symbol.toUpperCase();
  var today = nowVN();

  var start: string;
  if (opts.from) {
    start = parseDateInput(opts.from, today);
  } else if (opts.range) {
    start = parseDateInput(opts.range, today);
  } else {
    start = parseDateInput("30d", today);
  }
  var end = opts.to ? parseDateInput(opts.to, today) : todayISO();

  var rows = await vnstock.stock.quote.history({
    symbols: [symbol],
    start: start,
    end: end,
    timeFrame: "1D",
  });

  rows = rows.slice().sort(function (a: any, b: any) {
    return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
  });

  if (typeof opts.limit === "number" && opts.limit > 0) {
    rows = rows.slice(0, opts.limit);
  }

  if (opts.json) return renderJson(rows);
  if (opts.csv) return renderCsv(rows as any);

  var head = opts.verbose
    ? ["Date", "Open", "High", "Low", "Close", "Change", "Volume"]
    : ["Date", "Close", "Change", "Volume"];

  var tableRows: Array<Array<string | number>> = [];
  for (var i = 0; i < rows.length; i++) {
    var r: any = rows[i];
    var prev: any = rows[i + 1];
    var change = prev ? ((r.close - prev.close) / prev.close) * 100 : 0;
    var changeStr = priceColor(change, formatPercent(change), opts);
    if (opts.verbose) {
      tableRows.push([
        r.date,
        formatPrice(r.open),
        formatPrice(r.high),
        formatPrice(r.low),
        formatPrice(r.close),
        changeStr,
        compactNumber(r.volume),
      ]);
    } else {
      tableRows.push([
        r.date,
        formatPrice(r.close),
        changeStr,
        compactNumber(r.volume),
      ]);
    }
  }

  return renderTable({ head: head, rows: tableRows });
}
