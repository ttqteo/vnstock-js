import { Watchlist } from "../src/watchlist";
import { WatchlistStorage } from "../src/watchlist/storage";

class MemoryStorage implements WatchlistStorage {
  private data: string | null = null;
  async read() {
    return this.data;
  }
  async write(json: string) {
    this.data = json;
  }
  inspect() {
    return this.data;
  }
}

describe("Watchlist", () => {
  let storage: MemoryStorage;
  let wl: Watchlist;

  beforeEach(() => {
    storage = new MemoryStorage();
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
    const other = new MemoryStorage();
    wl.setStorage(other);
    expect(await wl.list("a")).toEqual([]);
  });

  it("invalid JSON in storage → graceful fallback", async () => {
    await storage.write("not-json{{{");
    const wl3 = new Watchlist(storage);
    expect(await wl3.listAll()).toEqual([]);
    await wl3.add("recovery", "VCB");
    expect(await wl3.list("recovery")).toEqual(["VCB"]);
  });

  it("throws on empty name in create", async () => {
    await expect(wl.create("")).rejects.toThrow();
  });
});
