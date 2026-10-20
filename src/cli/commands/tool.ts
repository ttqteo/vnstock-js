import type { Handler } from "../mcp/handlers";
import { renderTable } from "../renderers/table";
import { renderJson } from "../renderers/json";
import { price, money } from "../format/money";

export interface Column {
  key: string;
  label: string;
  format?: (v: any) => string;
}

export interface ToolRun {
  json: boolean;
  /** Columns to print the tool's data as a table under the summary. */
  columns?: Column[];
}

/**
 * Runs an MCP tool for the CLI, so both print the same text: the summary, then a table of the
 * data when columns are given; with --json the data alone. A tool error is thrown.
 */
export async function runTool(handlers: Record<string, Handler>, name: string, args: Record<string, unknown>, run: ToolRun): Promise<string> {
  const res = await handlers[name](args);
  const summary = res.content[0] ? res.content[0].text : "";
  if (res.isError) throw new Error(summary);
  const data = res.content[1] ? JSON.parse(res.content[1].text) : null;
  if (run.json) return renderJson(data);
  const cols = run.columns;
  if (!cols || !Array.isArray(data) || data.length === 0) return summary;
  const rows = data.map((row: any) =>
    cols.map((c) => (row[c.key] === undefined || row[c.key] === null ? "" : c.format ? c.format(row[c.key]) : String(row[c.key])))
  );
  return summary + "\n" + renderTable({ head: cols.map((c) => c.label), rows });
}

export const QUOTE_COLUMNS: Column[] = [
  { key: "symbol", label: "Mã" },
  { key: "price", label: "Giá", format: price },
  { key: "changePct", label: "%", format: (v) => (v > 0 ? "+" : "") + Number(v).toFixed(2) + "%" },
  { key: "volume", label: "KL", format: (v) => Number(v).toLocaleString("en-US") },
  { key: "value", label: "GTGD", format: money },
];

export const GOLD_COLUMNS: Column[] = [
  { key: "name", label: "Loại" },
  { key: "buy", label: "Mua (đ/lượng)", format: money },
  { key: "sell", label: "Bán (đ/lượng)", format: money },
];

const WHERE_PART = /^\s*([A-Za-z_]\w*)\s*(<=|>=|<|>|=)\s*(-?\d+(?:\.\d+)?(?:e\d+)?)\s*$/i;

/** "pe<15,roe>=0.15" to screen_stocks filters. */
export function parseWhere(text: string): { field: string; operator: string; value: number }[] {
  if (!text) return [];
  return text.split(",").map((part) => {
    const m = WHERE_PART.exec(part);
    if (!m) throw new Error(`Điều kiện không hợp lệ: "${part.trim()}". Ví dụ: pe<15,roe>0.15`);
    return { field: m[1], operator: m[2], value: Number(m[3]) };
  });
}
