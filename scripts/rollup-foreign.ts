import * as fs from "fs";
import * as path from "path";
import { ForeignSnapshot } from "./foreign-snapshot";

export interface ForeignMonth {
  month: string;
  unit: "VND";
  columns: ForeignSnapshot["columns"];
  days: { date: string; rows: ForeignSnapshot["rows"]; totals: ForeignSnapshot["totals"] }[];
}

export interface ForeignIndex {
  months: string[];
}

const DAY_FILE = /^\d{2}\.json$/;

/** The day snapshots of one month in one file, oldest first, so a reader needs one request per month. */
export function buildMonth(month: string, snapshots: ForeignSnapshot[]): ForeignMonth {
  const days = snapshots
    .filter((s) => s.date.substring(0, 7) === month)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((s) => ({ date: s.date, rows: s.rows, totals: s.totals }));
  return { month, unit: "VND", columns: ["symbol", "exchange", "buyVolume", "sellVolume", "buyValue", "sellValue"], days };
}

/** Reads data/foreign/YYYY/MM/DD.json of a month and writes data/foreign/YYYY/MM.json. Returns the day count. */
export function rollupMonth(root: string, month: string): number {
  const [y, m] = month.split("-");
  const dir = path.join(root, y, m);
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => DAY_FILE.test(f)) : [];
  if (files.length === 0) return 0;
  const snaps = files.map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as ForeignSnapshot);
  fs.writeFileSync(path.join(root, y, m + ".json"), JSON.stringify(buildMonth(month, snaps)) + "\n");
  return snaps.length;
}

/** Writes data/foreign/index.json listing every month that has a rollup, oldest first. Writes nothing before the first recording. */
export function writeIndex(root: string): ForeignIndex {
  const months: string[] = [];
  if (!fs.existsSync(root)) return { months };
  const years = fs.readdirSync(root).filter((d) => /^\d{4}$/.test(d));
  for (const y of years) {
    for (const f of fs.readdirSync(path.join(root, y))) {
      const m = /^(\d{2})\.json$/.exec(f);
      if (m) months.push(y + "-" + m[1]);
    }
  }
  months.sort();
  const index = { months };
  fs.writeFileSync(path.join(root, "index.json"), JSON.stringify(index) + "\n");
  return index;
}

/** Months that have day files, for a full rebuild. */
function dayMonths(root: string): string[] {
  const out: string[] = [];
  const years = fs.existsSync(root) ? fs.readdirSync(root).filter((d) => /^\d{4}$/.test(d)) : [];
  for (const y of years) {
    for (const m of fs.readdirSync(path.join(root, y))) {
      if (/^\d{2}$/.test(m) && fs.statSync(path.join(root, y, m)).isDirectory()) out.push(y + "-" + m);
    }
  }
  return out.sort();
}

function ictToday(): string {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().substring(0, 10);
}

function main(): void {
  const root = path.join(__dirname, "..", "data", "foreign");
  const arg = process.argv[2];
  if (arg && arg !== "--all" && !/^\d{4}-\d{2}(-\d{2})?$/.test(arg)) throw new Error("Pass YYYY-MM, YYYY-MM-DD or --all, got " + arg);
  const months = arg === "--all" ? dayMonths(root) : [(arg || ictToday()).substring(0, 7)];
  for (const month of months) console.log(month + ": " + rollupMonth(root, month) + " day(s)");
  console.log("index: " + writeIndex(root).months.length + " month(s)");
}

if (require.main === module) main();
