import type { Client } from "../../client";
import type { Bar } from "../../types";
import { renderJson } from "../renderers/json";
import { renderCsv } from "../renderers/csv";
import { renderTable } from "../renderers/table";
import { parseDateInput, todayISO, nowVN } from "../format/date";
import { formatPercent, compactNumber } from "../format/number";
import { price } from "../format/money";
import { priceColor, bold, dim } from "../format/color";
import { isIndexSymbol } from "../../shared/time";

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

function shiftDays(date: string, days: number): string {
  var d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().substring(0, 10);
}

export async function handleHistory(client: Client, opts: HistoryOpts): Promise<string> {
  var symbol = opts.symbol.toUpperCase();
  var today = nowVN();

  var start = parseDateInput(opts.from || opts.range || "30d", today);
  var end = opts.to ? parseDateInput(opts.to, today) : todayISO();

  // Read 15 calendar days before `start` so the oldest row in the window still
  // has a previous close for its change (covers weekends and holidays).
  var bars = await client.stock(symbol).history({ from: shiftDays(start, -15), to: end });
  var sortedAll = bars.slice().sort(function (a, b) {
    return a.time < b.time ? 1 : a.time > b.time ? -1 : 0;
  });

  var rows: Bar[] = [];
  var prevRefs: Record<string, Bar | undefined> = {};
  for (var i = 0; i < sortedAll.length; i++) {
    var r = sortedAll[i];
    if (r.time >= start && r.time <= end) {
      rows.push(r);
      prevRefs[r.time] = sortedAll[i + 1];
    }
  }

  if (typeof opts.limit === "number" && opts.limit > 0) {
    rows = rows.slice(0, opts.limit);
  }

  if (opts.json) return renderJson(rows);
  if (opts.csv) return renderCsv(rows as any);

  // Indices are levels in points, stocks are prices in dong.
  var fmt = isIndexSymbol(symbol)
    ? function (v: number) {
        return v.toFixed(2);
      }
    : price;

  var head = opts.verbose ? ["Date", "Open", "High", "Low", "Close", "Change", "Volume"] : ["Date", "Close", "Change", "Volume"];

  var tableRows: Array<Array<string | number>> = [];
  for (var j = 0; j < rows.length; j++) {
    var row = rows[j];
    var prev = rows[j + 1] || prevRefs[row.time];
    var change = prev ? ((row.close - prev.close) / prev.close) * 100 : 0;
    var changeStr = prev ? priceColor(change, formatPercent(change), opts) : "—";
    if (opts.verbose) {
      tableRows.push([row.time, fmt(row.open), fmt(row.high), fmt(row.low), fmt(row.close), changeStr, compactNumber(row.volume)]);
    } else {
      tableRows.push([row.time, fmt(row.close), changeStr, compactNumber(row.volume)]);
    }
  }

  var header = bold(symbol, opts) + dim("  " + start + " → " + end + "  (" + rows.length + " phiên)", opts);
  return header + "\n" + renderTable({ head: head, rows: tableRows });
}
