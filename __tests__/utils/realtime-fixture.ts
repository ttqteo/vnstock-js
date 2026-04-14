import * as fs from "fs";
import * as path from "path";

export interface FixtureLine {
  t: number;
  dir: "in" | "out" | "event";
  raw: string;
}

export function loadFixture(name: string): FixtureLine[] {
  var filePath = path.join(__dirname, "..", "fixtures", "realtime", name);
  var content = fs.readFileSync(filePath, "utf8");
  var lines = content.split(/\r?\n/).filter(function (l: string) {
    return l.length > 0;
  });
  return lines.map(function (line: string) {
    return JSON.parse(line) as FixtureLine;
  });
}

export function incomingQuoteLines(fixture: FixtureLine[]): string[] {
  var out: string[] = [];
  for (var i = 0; i < fixture.length; i++) {
    var ln = fixture[i];
    if (ln.dir === "in" && ln.raw.indexOf("|") !== -1) {
      out.push(ln.raw);
    }
  }
  return out;
}
