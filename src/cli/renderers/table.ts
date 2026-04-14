import Table from "cli-table3";

export interface TableOptions {
  head: string[];
  rows: Array<Array<string | number>>;
  colAligns?: Array<"left" | "right" | "center">;
}

export function renderTable(opts: TableOptions): string {
  var tableOpts: any = {
    head: opts.head,
    style: {
      head: [],
      border: [],
    },
  };
  if (opts.colAligns) tableOpts.colAligns = opts.colAligns;
  var table = new Table(tableOpts);
  for (var i = 0; i < opts.rows.length; i++) {
    table.push(opts.rows[i] as any);
  }
  return table.toString();
}

export function renderGrid(
  items: string[],
  colWidth: number = 5,
  width?: number
): string {
  var effectiveWidth = width !== undefined ? width : (process.stdout.columns || 80);
  var cols = Math.max(1, Math.floor(effectiveWidth / (colWidth + 2)));
  var lines: string[] = [];
  for (var i = 0; i < items.length; i += cols) {
    var chunk = items.slice(i, i + cols);
    var line = "";
    for (var j = 0; j < chunk.length; j++) {
      line += chunk[j].padEnd(colWidth + 2);
    }
    lines.push(line.trimEnd());
  }
  return lines.join("\n");
}
