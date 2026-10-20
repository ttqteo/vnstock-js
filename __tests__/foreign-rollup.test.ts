import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { buildMonth, rollupMonth, writeIndex } from "../scripts/rollup-foreign";
import { ForeignSnapshot } from "../scripts/foreign-snapshot";

const zero = { buyValue: 0, sellValue: 0, netValue: 0 };

function snap(date: string, rows: ForeignSnapshot["rows"]): ForeignSnapshot {
  return {
    date,
    unit: "VND",
    columns: ["symbol", "exchange", "buyVolume", "sellVolume", "buyValue", "sellValue"],
    rows,
    totals: { HOSE: zero, HNX: zero, UPCOM: zero },
  };
}

function writeDay(root: string, s: ForeignSnapshot): void {
  const [y, m, d] = s.date.split("-");
  fs.mkdirSync(path.join(root, y, m), { recursive: true });
  fs.writeFileSync(path.join(root, y, m, d + ".json"), JSON.stringify(s));
}

let root: string;
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "vnstock-foreign-"));
});
afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe("buildMonth", () => {
  it("keeps the days of one month, oldest first", () => {
    const m = buildMonth("2026-10", [snap("2026-10-13", []), snap("2026-09-30", []), snap("2026-10-12", [["FPT", "HOSE", 1, 0, 127000, 0]])]);
    expect(m.month).toBe("2026-10");
    expect(m.unit).toBe("VND");
    expect(m.days.map((d) => d.date)).toEqual(["2026-10-12", "2026-10-13"]);
    expect(m.days[0].rows).toEqual([["FPT", "HOSE", 1, 0, 127000, 0]]);
  });
});

describe("rollupMonth", () => {
  it("writes YYYY/MM.json from the day files and ignores other files", () => {
    writeDay(root, snap("2026-10-13", []));
    writeDay(root, snap("2026-10-12", []));
    fs.writeFileSync(path.join(root, "2026", "10", "notes.txt"), "x");
    expect(rollupMonth(root, "2026-10")).toBe(2);
    const out = JSON.parse(fs.readFileSync(path.join(root, "2026", "10.json"), "utf8"));
    expect(out.days.map((d: any) => d.date)).toEqual(["2026-10-12", "2026-10-13"]);
  });

  it("writes nothing for a month without day files", () => {
    expect(rollupMonth(root, "2026-11")).toBe(0);
    expect(fs.existsSync(path.join(root, "2026", "11.json"))).toBe(false);
  });
});

describe("writeIndex", () => {
  it("lists the months that have a rollup, oldest first", () => {
    writeDay(root, snap("2026-10-12", []));
    writeDay(root, snap("2026-09-30", []));
    writeDay(root, snap("2025-12-31", []));
    for (const m of ["2026-10", "2026-09", "2025-12"]) rollupMonth(root, m);
    expect(writeIndex(root)).toEqual({ months: ["2025-12", "2026-09", "2026-10"] });
    expect(JSON.parse(fs.readFileSync(path.join(root, "index.json"), "utf8"))).toEqual({ months: ["2025-12", "2026-09", "2026-10"] });
  });

  it("writes nothing when nothing was recorded yet", () => {
    const missing = path.join(root, "foreign");
    expect(writeIndex(missing)).toEqual({ months: [] });
    expect(fs.existsSync(missing)).toBe(false);
  });
});
