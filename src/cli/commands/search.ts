import { Directory } from "../../core/listing/directory";
import { renderJson } from "../renderers/json";
import { renderCsv } from "../renderers/csv";
import { renderTable } from "../renderers/table";

export const meta = { requiresData: true };

export interface SearchOpts {
  query: string;
  limit?: number;
  json: boolean;
  csv: boolean;
  color: boolean;
  quiet: boolean;
  verbose: boolean;
}

export async function handleSearch(opts: SearchOpts): Promise<string> {
  var limit = typeof opts.limit === "number" && opts.limit > 0 ? opts.limit : 10;
  var results = Directory.search(opts.query, { limit: limit });

  if (opts.json) return renderJson(results);
  if (opts.csv) return renderCsv(results as any);

  if (results.length === 0) return "No matches for: " + opts.query;

  var head = ["Symbol", "Name", "Exchange"];
  var rows: Array<Array<string>> = results.map(function (r: any): string[] {
    return [r.symbol, r.companyName, r.exchange];
  });
  return renderTable({ head: head, rows: rows });
}
