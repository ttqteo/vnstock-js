import { WatchlistStorage, defaultStorage } from "./storage";

interface WatchlistRecord {
  symbols: string[];
  createdAt: string;
}

type WatchlistData = Record<string, WatchlistRecord>;

export class Watchlist {
  private storage: WatchlistStorage;
  private cache: WatchlistData | null = null;

  constructor(storage?: WatchlistStorage) {
    this.storage = storage || defaultStorage();
  }

  setStorage(storage: WatchlistStorage) {
    this.storage = storage;
    this.cache = null;
  }

  private async load(): Promise<WatchlistData> {
    if (this.cache) return this.cache;
    var raw = await this.storage.read();
    var data: WatchlistData = {};
    if (raw) {
      try {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") data = parsed;
      } catch (e) {
        // fallback to empty
      }
    }
    this.cache = data;
    return data;
  }

  private async save(data: WatchlistData): Promise<void> {
    this.cache = data;
    await this.storage.write(JSON.stringify(data, null, 2));
  }

  async create(name: string): Promise<void> {
    if (!name) throw new Error("Watchlist name required");
    var data = await this.load();
    if (data[name]) return;
    data[name] = { symbols: [], createdAt: new Date().toISOString().substring(0, 10) };
    await this.save(data);
  }

  async delete(name: string): Promise<void> {
    var data = await this.load();
    if (!data[name]) return;
    delete data[name];
    await this.save(data);
  }

  async add(name: string, symbols: string | string[]): Promise<void> {
    var data = await this.load();
    if (!data[name]) {
      data[name] = { symbols: [], createdAt: new Date().toISOString().substring(0, 10) };
    }
    var list = Array.isArray(symbols) ? symbols : [symbols];
    var existing = data[name].symbols;
    for (var i = 0; i < list.length; i++) {
      var s = list[i].toUpperCase();
      if (existing.indexOf(s) === -1) existing.push(s);
    }
    await this.save(data);
  }

  async remove(name: string, symbol: string): Promise<void> {
    var data = await this.load();
    if (!data[name]) return;
    var upper = symbol.toUpperCase();
    data[name].symbols = data[name].symbols.filter(function (s) {
      return s !== upper;
    });
    await this.save(data);
  }

  async list(name: string): Promise<string[]> {
    var data = await this.load();
    return data[name] ? data[name].symbols.slice() : [];
  }

  async listAll(): Promise<string[]> {
    var data = await this.load();
    return Object.keys(data);
  }

  async has(name: string): Promise<boolean> {
    var data = await this.load();
    return !!data[name];
  }
}
