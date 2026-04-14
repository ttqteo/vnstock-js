function escape(value: unknown): string {
  var s = value === null || value === undefined ? "" : String(value);
  if (s.indexOf(",") !== -1 || s.indexOf('"') !== -1 || s.indexOf("\n") !== -1) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function renderCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return "";
  var headers = Object.keys(rows[0]);
  var lines = [headers.join(",")];
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var cells: string[] = [];
    for (var j = 0; j < headers.length; j++) {
      cells.push(escape(row[headers[j]]));
    }
    lines.push(cells.join(","));
  }
  return lines.join("\n");
}
