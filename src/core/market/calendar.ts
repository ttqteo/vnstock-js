/** Holiday dates (YYYY-MM-DD) keyed by year, as in data/holidays.json. */
export type HolidayTable = Record<string, string[]>;

function parseDate(s: string): Date {
  var p = s.split("-");
  return new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
}

function formatDate(d: Date): string {
  var y = d.getFullYear();
  var m = d.getMonth() + 1;
  var day = d.getDate();
  return y + "-" + (m < 10 ? "0" : "") + m + "-" + (day < 10 ? "0" : "") + day;
}

/** A weekday that is not a listed holiday. */
export function isTradeDay(table: HolidayTable, dateStr: string): boolean {
  var d = parseDate(dateStr);
  var dow = d.getDay();
  if (dow === 0 || dow === 6) return false;
  var year = String(d.getFullYear());
  var list = table[year] || [];
  return list.indexOf(dateStr) === -1;
}

/** The first trade day after the date, looking at most 30 days ahead. */
export function nextTradeDay(table: HolidayTable, dateStr: string): string {
  var d = parseDate(dateStr);
  for (var i = 0; i < 30; i++) {
    d.setDate(d.getDate() + 1);
    var s = formatDate(d);
    if (isTradeDay(table, s)) return s;
  }
  throw new Error("No trade day found within 30 days after " + dateStr);
}

/** The last trade day before the date, looking at most 30 days back. */
export function prevTradeDay(table: HolidayTable, dateStr: string): string {
  var d = parseDate(dateStr);
  for (var i = 0; i < 30; i++) {
    d.setDate(d.getDate() - 1);
    var s = formatDate(d);
    if (isTradeDay(table, s)) return s;
  }
  throw new Error("No trade day found within 30 days before " + dateStr);
}

/** Holidays of one year. */
export function holidays(table: HolidayTable, year: number): string[] {
  return table[String(year)] || [];
}
