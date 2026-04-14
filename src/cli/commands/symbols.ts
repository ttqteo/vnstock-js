import { Directory } from "../../core/listing/directory";
import { renderJson } from "../renderers/json";
import { renderCsv } from "../renderers/csv";
import { renderTable, renderGrid } from "../renderers/table";
import { bold, dim } from "../format/color";

export const meta = { requiresData: true };

export interface SymbolsOpts {
  exchange?: string;
  limit?: number;
  json: boolean;
  csv: boolean;
  color: boolean;
  quiet: boolean;
  verbose: boolean;
}

export async function handleSymbols(opts: SymbolsOpts): Promise<string> {
  var results: Array<any>;
  if (opts.exchange) {
    results = Directory.getByExchange(opts.exchange);
  } else {
    results = Directory.all();
  }

  if (typeof opts.limit === "number" && opts.limit > 0) {
    results = results.slice(0, opts.limit);
  }

  if (opts.json) return renderJson(results);
  if (opts.csv) return renderCsv(results as any);

  var label = opts.exchange ? opts.exchange.toUpperCase() : "All exchanges";
  var header = bold(label, opts) + dim("  (" + results.length + " mã)", opts);

  if (opts.verbose) {
    var head = ["Symbol", "Name"];
    var rows: Array<Array<string>> = results.map(function (r: any): string[] {
      return [r.symbol, r.companyName];
    });
    return header + "\n" + renderTable({ head: head, rows: rows });
  }

  var syms: string[] = results.map(function (r: any): string {
    return r.symbol;
  });
  var maxLen = 3;
  for (var i = 0; i < syms.length; i++) {
    if (syms[i].length > maxLen) maxLen = syms[i].length;
  }
  return header + "\n" + renderGrid(syms, maxLen);
}
