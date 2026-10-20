import { Watchlist } from "../src/watchlist";
import { memoryStorage, Storage } from "../src/storage";
import { fileStorage } from "../src/node";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

describe("Watchlist", () => {
  let storage: Storage;
  let wl: Watchlist;

  beforeEach(() => {
    storage = memoryStorage();
    wl = new Watchlist(storage);
  });

  it("create + has + listAll", async () => {
    await wl.create("banks");
    expect(await wl.has("banks")).toBe(true);
    expect(await wl.listAll()).toEqual(["banks"]);
  });

  it("add string symbol uppercases", async () => {
    await wl.create("banks");
    await wl.add("banks", "vcb");
    expect(await wl.list("banks")).toEqual(["VCB"]);
  });

  it("add array of symbols", async () => {
    await wl.add("tech", ["FPT", "CMG"]);
    expect(await wl.list("tech")).toEqual(["FPT", "CMG"]);
  });

  it("add creates watchlist implicitly", async () => {
    await wl.add("misc", "VCB");
    expect(await wl.has("misc")).toBe(true);
    expect(await wl.list("misc")).toEqual(["VCB"]);
  });

  it("dedup on add", async () => {
    await wl.add("banks", ["VCB", "TCB"]);
    await wl.add("banks", "VCB");
    await wl.add("banks", "vcb");
    expect(await wl.list("banks")).toEqual(["VCB", "TCB"]);
  });

  it("remove symbol", async () => {
    await wl.add("banks", ["VCB", "TCB", "MBB"]);
    await wl.remove("banks", "TCB");
    expect(await wl.list("banks")).toEqual(["VCB", "MBB"]);
  });

  it("delete watchlist", async () => {
    await wl.add("temp", "VCB");
    await wl.delete("temp");
    expect(await wl.has("temp")).toBe(false);
    expect(await wl.list("temp")).toEqual([]);
  });

  it("list returns empty for missing watchlist", async () => {
    expect(await wl.list("nonexistent")).toEqual([]);
  });

  it("persists across instances via same storage", async () => {
    await wl.add("banks", ["VCB", "TCB"]);
    const wl2 = new Watchlist(storage);
    expect(await wl2.list("banks")).toEqual(["VCB", "TCB"]);
  });

  it("setStorage swaps backend", async () => {
    await wl.add("a", "VCB");
    const other = memoryStorage();
    wl.setStorage(other);
    expect(await wl.list("a")).toEqual([]);
  });

  it("invalid JSON in storage → graceful fallback", async () => {
    await storage.set("watchlist", "not-json{{{");
    const wl3 = new Watchlist(storage);
    expect(await wl3.listAll()).toEqual([]);
    await wl3.add("recovery", "VCB");
    expect(await wl3.list("recovery")).toEqual(["VCB"]);
  });

  it("keeps everything under one storage key", async () => {
    await wl.add("banks", "VCB");
    expect(JSON.parse((await storage.get("watchlist")) as string).banks.symbols).toEqual(["VCB"]);
  });

  it("reads and writes the v1 file ~/.vnstock-js/watchlist.json through fileStorage", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vns-wl-"));
    fs.writeFileSync(path.join(dir, "watchlist.json"), JSON.stringify({ old: { symbols: ["FPT"], createdAt: "2026-01-01" } }));
    const fromFile = new Watchlist(fileStorage(dir));
    expect(await fromFile.list("old")).toEqual(["FPT"]);
    await fromFile.add("old", "VCB");
    expect(JSON.parse(fs.readFileSync(path.join(dir, "watchlist.json"), "utf8")).old.symbols).toEqual(["FPT", "VCB"]);
  });

  it("throws on empty name in create", async () => {
    await expect(wl.create("")).rejects.toThrow();
  });
});
