import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { fetchJson } from "../data/fetch";

var REGISTRY_URL = "https://registry.npmjs.org/vnstock-js/latest";
var TTL_MS = 24 * 60 * 60 * 1000;
var FETCH_TIMEOUT_MS = 2000;

interface CacheFile {
  latestVersion: string;
  checkedAt: number;
}

interface RegistryResponse {
  version: string;
}

function cacheFilePath(): string {
  var dir: string;
  try {
    dir = path.join(os.homedir(), ".vnstock-js", "cache");
  } catch (_e) {
    dir = path.join(os.tmpdir(), "vnstock-js-cache");
  }
  return path.join(dir, "version-check.json");
}

function readCache(): CacheFile | null {
  try {
    var p = cacheFilePath();
    if (!fs.existsSync(p)) return null;
    var raw = fs.readFileSync(p, "utf8");
    var parsed = JSON.parse(raw) as CacheFile;
    if (typeof parsed.latestVersion !== "string") return null;
    if (typeof parsed.checkedAt !== "number") return null;
    return parsed;
  } catch (_e) {
    return null;
  }
}

function writeCache(latestVersion: string): void {
  try {
    var p = cacheFilePath();
    var dir = path.dirname(p);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    var payload: CacheFile = { latestVersion: latestVersion, checkedAt: Date.now() };
    fs.writeFileSync(p, JSON.stringify(payload));
  } catch (_e) {
    // non-fatal
  }
}

function parseSemver(v: string): number[] | null {
  var m = v.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return null;
  return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
}

function isNewer(latest: string, current: string): boolean {
  var a = parseSemver(latest);
  var b = parseSemver(current);
  if (!a || !b) return false;
  for (var i = 0; i < 3; i++) {
    if (a[i] > b[i]) return true;
    if (a[i] < b[i]) return false;
  }
  return false;
}

function shouldSkip(): boolean {
  if (!process.stderr.isTTY) return true;
  if (process.env.CI) return true;
  if (process.env.NODE_ENV === "test") return true;
  if (process.env.VNSTOCK_NO_UPDATE_CHECK) return true;
  return false;
}

/**
 * Returns the latest version string if newer than current, otherwise null.
 * Silently returns null on any error. Respects 24h cache and CI/non-TTY skip.
 */
export async function checkForUpdate(currentVersion: string): Promise<string | null> {
  if (shouldSkip()) return null;

  var cached = readCache();
  var now = Date.now();

  if (cached && now - cached.checkedAt < TTL_MS) {
    return isNewer(cached.latestVersion, currentVersion) ? cached.latestVersion : null;
  }

  try {
    var data = await fetchJson<RegistryResponse>(REGISTRY_URL, FETCH_TIMEOUT_MS);
    if (!data || typeof data.version !== "string") return null;
    writeCache(data.version);
    return isNewer(data.version, currentVersion) ? data.version : null;
  } catch (_e) {
    return null;
  }
}

/**
 * Prints update banner to stderr. Safe to call even if no update.
 */
export function printUpdateBanner(latestVersion: string, currentVersion: string): void {
  var line1 = "Update available: " + currentVersion + " \u2192 " + latestVersion;
  var line2 = "Run: npm i -g vnstock-js";
  var width = Math.max(line1.length, line2.length) + 4;
  var top = "\u250C" + repeat("\u2500", width) + "\u2510";
  var bot = "\u2514" + repeat("\u2500", width) + "\u2518";
  var mid1 = "\u2502  " + line1 + repeat(" ", width - line1.length - 2) + "\u2502";
  var mid2 = "\u2502  " + line2 + repeat(" ", width - line2.length - 2) + "\u2502";
  process.stderr.write("\n" + top + "\n" + mid1 + "\n" + mid2 + "\n" + bot + "\n");
}

function repeat(s: string, n: number): string {
  var out = "";
  for (var i = 0; i < n; i++) out += s;
  return out;
}