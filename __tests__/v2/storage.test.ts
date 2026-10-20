import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { memoryStorage } from "../../src/storage";
import { fileStorage, defaultDir, fallbackDir } from "../../src/node";

describe.each([
  ["memory", () => memoryStorage()],
  ["file", () => fileStorage(fs.mkdtempSync(path.join(os.tmpdir(), "vns-")))],
])("%s storage", (_name, make) => {
  it("round-trips, overwrites and removes", async () => {
    const s = make();
    expect(await s.get("k")).toBeNull();
    await s.set("k", "1");
    await s.set("k", "2");
    expect(await s.get("k")).toBe("2");
    await s.remove("k");
    expect(await s.get("k")).toBeNull();
    await expect(s.remove("k")).resolves.toBeUndefined();
  });

  it("keeps keys apart", async () => {
    const s = make();
    await s.set("a", "1");
    await s.set("b", "2");
    expect([await s.get("a"), await s.get("b")]).toEqual(["1", "2"]);
  });
});

describe("fileStorage", () => {
  it("does not touch the disk until the first write", async () => {
    const dir = path.join(os.tmpdir(), "vns-lazy-" + Date.now());
    const s = fileStorage(dir);
    expect(await s.get("k")).toBeNull();
    await s.remove("k");
    expect(fs.existsSync(dir)).toBe(false);
  });

  it("keeps keys safe as file names and leaves no temp files", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vns-"));
    const s = fileStorage(dir);
    await s.set("cache/symbols", "x");
    expect(await s.get("cache/symbols")).toBe("x");
    expect(fs.readdirSync(dir)).toEqual(["cache%2Fsymbols.json"]);
  });

  it("falls back to the temp directory when the directory cannot be created, and reads back from there", async () => {
    const parent = fs.mkdtempSync(path.join(os.tmpdir(), "vns-block-"));
    const blocker = path.join(parent, "file");
    fs.writeFileSync(blocker, "");
    const key = "fallback-" + Date.now();
    const s = fileStorage(path.join(blocker, "sub"));
    await s.set(key, "v");
    expect(await s.get(key)).toBe("v");
    expect(fs.existsSync(path.join(fallbackDir(), key + ".json"))).toBe(true);
    expect(await fileStorage(path.join(blocker, "sub")).get(key)).toBe("v");
    await s.remove(key);
    expect(await s.get(key)).toBeNull();
  });

  const posix = typeof process.getuid === "function" ? it : it.skip;

  posix("keeps its temp fallback per user and private", async () => {
    expect(fallbackDir()).toBe(path.join(os.tmpdir(), "vnstock-js-" + (process.getuid as () => number)()));
    const parent = fs.mkdtempSync(path.join(os.tmpdir(), "vns-block-"));
    fs.writeFileSync(path.join(parent, "file"), "");
    await fileStorage(path.join(parent, "file", "sub")).set("private-" + Date.now(), "v");
    expect(fs.statSync(fallbackDir()).mode & 0o077).toBe(0);
  });

  posix("ignores a temp fallback others can write to", async () => {
    const key = "planted-" + Date.now();
    fs.mkdirSync(fallbackDir(), { recursive: true });
    fs.writeFileSync(path.join(fallbackDir(), key + ".json"), "planted");
    const before = fs.statSync(fallbackDir()).mode & 0o777;
    fs.chmodSync(fallbackDir(), 0o777);
    try {
      const s = fileStorage(fs.mkdtempSync(path.join(os.tmpdir(), "vns-")));
      expect(await s.get(key)).toBeNull();
    } finally {
      fs.chmodSync(fallbackDir(), before);
      fs.unlinkSync(path.join(fallbackDir(), key + ".json"));
    }
  });

  it("defaults to ~/.vnstock-js", () => {
    expect(defaultDir()).toBe(path.join(os.homedir(), ".vnstock-js"));
  });
});
