import { Directory } from "../../core/listing/directory";
import { renderJson } from "../renderers/json";
import { renderCsv } from "../renderers/csv";
import { renderTable, renderGrid } from "../renderers/table";

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

  var limit = typeof opts.limit === "number" && opts.limit > 0 ? opts.limit : 50;
  results = results.slice(0, limit);

  if (opts.json) return renderJson(results);
  if (opts.csv) return renderCsv(results as any);

  if (opts.verbose) {
    var head = ["Symbol", "Name"];
    var rows: Array<Array<string>> = results.map(function (r: any): string[] {
      return [r.symbol, r.companyName];
    });
    return renderTable({ head: head, rows: rows });
  }

  var syms: string[] = results.map(function (r: any): string {
    return r.symbol;
  });
  var maxLen = 3;
  for (var i = 0; i < syms.length; i++) {
    if (syms[i].length > maxLen) maxLen = syms[i].length;
  }
  return renderGrid(syms, maxLen);
}
