import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { DiskCache } from "../src/data/cache";

describe("DiskCache", () => {
  let tmpDir: string;
  let cache: DiskCache;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vnstock-cache-test-"));
    cache = new DiskCache(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns null when no cache file exists", () => {
    const result = cache.read("symbols");
    expect(result).toBeNull();
  });

  it("writes and reads back data + metadata", () => {
    cache.write("symbols", [{ symbol: "VCB" }], "https://example.com/s.json");
    const result = cache.read("symbols");
    expect(result).not.toBeNull();
    expect(result!.data).toEqual([{ symbol: "VCB" }]);
    expect(result!.url).toBe("https://example.com/s.json");
    expect(typeof result!.fetchedAt).toBe("number");
    expect(result!.fetchedAt).toBeLessThanOrEqual(Date.now());
  });

  it("isolates symbols and holidays", () => {
    cache.write("symbols", [{ symbol: "A" }], "u1");
    cache.write("holidays", { "2025": ["2025-01-01"] }, "u2");
    expect(cache.read("symbols")!.data).toEqual([{ symbol: "A" }]);
    expect(cache.read("holidays")!.data).toEqual({ "2025": ["2025-01-01"] });
  });

  it("creates cache dir if missing", () => {
    const nestedDir = path.join(tmpDir, "nested", "deeper");
    const c = new DiskCache(nestedDir);
    c.write("symbols", [], "u");
    expect(fs.existsSync(path.join(nestedDir, "symbols.json"))).toBe(true);
  });

  it("returns null if data file exists but meta missing", () => {
    fs.writeFileSync(path.join(tmpDir, "symbols.json"), "[]");
    expect(cache.read("symbols")).toBeNull();
  });
});
