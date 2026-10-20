import { Transport } from "../transport";
import { Storage } from "../storage";
import { DataUnavailableError } from "../errors";
import { SymbolInfo } from "../models/normalized";
import { SymbolRatios, RatiosFile } from "../models/ratios";
import { DEFAULT_SYMBOLS_URL, DEFAULT_HOLIDAYS_URL, DEFAULT_RATIOS_URL, DEFAULT_TTL_MS } from "./urls";

export interface DatasetOptions {
  transport: Transport;
  storage: Storage;
  /** How long a stored copy counts as fresh, in ms. Default one day. */
  ttl?: number;
  urls?: { symbols?: string; holidays?: string; ratios?: string };
}

export interface Datasets {
  symbols(): Promise<SymbolInfo[]>;
  holidays(): Promise<Record<string, string[]>>;
  /** Null when the prebuilt file is unreachable; screening then asks per symbol. */
  ratios(): Promise<Record<string, SymbolRatios> | null>;
}

type Name = "symbols" | "holidays" | "ratios";

interface Stored<T> {
  fetchedAt: number;
  data: T;
}

function parseStored<T>(raw: string | null): Stored<T> | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return v && typeof v.fetchedAt === "number" && "data" in v ? (v as Stored<T>) : null;
  } catch {
    return null;
  }
}

/**
 * Prebuilt datasets loaded on first use, at most once per process, through a Storage cache.
 * A fresh stored copy skips the network; when the network fails a stale copy is served.
 * @example
 * const ds = createDatasets({ transport: createTransport(), storage: memoryStorage() });
 * const symbols = await ds.symbols();
 */
export function createDatasets(o: DatasetOptions): Datasets {
  const ttl = o.ttl ?? DEFAULT_TTL_MS;
  const urls = { symbols: DEFAULT_SYMBOLS_URL, holidays: DEFAULT_HOLIDAYS_URL, ratios: DEFAULT_RATIOS_URL, ...o.urls };
  const pending: Partial<Record<Name, Promise<unknown>>> = {};

  async function load<T>(name: Name): Promise<T> {
    const key = "dataset:" + name;
    const cached = parseStored<T>(await o.storage.get(key).catch(() => null));
    // A copy dated in the future is not fresh, or it would never expire.
    const age = cached ? Date.now() - cached.fetchedAt : -1;
    if (cached && age >= 0 && age < ttl) return cached.data;
    try {
      const data = await o.transport.request<T>({ url: urls[name], method: "GET" });
      await o.storage.set(key, JSON.stringify({ fetchedAt: Date.now(), data })).catch(() => undefined);
      return data;
    } catch (err) {
      if (cached) return cached.data;
      throw new DataUnavailableError(name, err instanceof Error ? err : undefined);
    }
  }

  function once<T>(name: Name, map: (x: any) => T): Promise<T> {
    let p = pending[name] as Promise<T> | undefined;
    if (!p) {
      p = load(name).then(map);
      pending[name] = p;
      // A failure is not cached: the next call tries again.
      p.catch(() => {
        delete pending[name];
      });
    }
    return p;
  }

  return {
    symbols: () => once("symbols", (x) => x as SymbolInfo[]),
    holidays: () => once("holidays", (x) => x as Record<string, string[]>),
    ratios: () =>
      once("ratios", (file: RatiosFile) => {
        const out: Record<string, SymbolRatios> = {};
        for (const r of (file && file.ratios) || []) out[r.symbol] = r;
        return out;
      }).catch(() => null),
  };
}
