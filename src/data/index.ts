import * as os from "os";
import * as path from "path";
import { SymbolInfo } from "../models/normalized";
import { SymbolRatios, RatiosFile } from "../models/ratios";
import { NotInitializedError, DataUnavailableError } from "../errors";
import { fetchJson } from "./fetch";
import { DiskCache } from "./cache";
import {
  DEFAULT_SYMBOLS_URL,
  DEFAULT_HOLIDAYS_URL,
  DEFAULT_RATIOS_URL,
  DEFAULT_TTL_MS,
  DEFAULT_FETCH_TIMEOUT_MS,
} from "./urls";
import { InitOptions, DataState } from "./types";

export { InitOptions } from "./types";

let state: DataState | null = null;

function defaultCacheDir(): string {
  try {
    return path.join(os.homedir(), ".vnstock-js", "cache");
  } catch (_e) {
    return path.join(os.tmpdir(), "vnstock-js-cache");
  }
}

export async function init(options?: InitOptions): Promise<void> {
  const opts = options || {};
  const symbolsUrl = opts.symbolsUrl || DEFAULT_SYMBOLS_URL;
  const holidaysUrl = opts.holidaysUrl || DEFAULT_HOLIDAYS_URL;
  const ttl = typeof opts.ttl === "number" ? opts.ttl : DEFAULT_TTL_MS;
  const force = opts.force === true;
  const noCache = opts.noCache === true;
  const timeout = opts.timeout || DEFAULT_FETCH_TIMEOUT_MS;
  const cacheDir = opts.cacheDir || defaultCacheDir();

  const cache = noCache ? null : new DiskCache(cacheDir);

  const symbols = await loadDataset<SymbolInfo[]>(
    "symbols",
    symbolsUrl,
    timeout,
    ttl,
    force,
    cache
  );
  const holidays = await loadDataset<Record<string, string[]>>(
    "holidays",
    holidaysUrl,
    timeout,
    ttl,
    force,
    cache
  );

  // Opt-in: most callers never screen, and this is another download.
  let ratios: Record<string, SymbolRatios> | null = null;
  if (opts.ratios === true) {
    try {
      const file = await loadDataset<RatiosFile>(
        "ratios",
        opts.ratiosUrl || DEFAULT_RATIOS_URL,
        timeout,
        ttl,
        force,
        cache
      );
      ratios = {};
      for (const r of file.data.ratios || []) ratios[r.symbol] = r;
    } catch (_e) {
      // Screening falls back to per-symbol requests, so a missing file is a
      // slowdown rather than a failure. Do not take init() down with it.
      ratios = null;
    }
  }

  state = {
    symbols: symbols.data,
    holidays: holidays.data,
    ratios,
    symbolsFetchedAt: symbols.fetchedAt,
    holidaysFetchedAt: holidays.fetchedAt,
  };
}

async function loadDataset<T>(
  name: "symbols" | "holidays" | "ratios",
  url: string,
  timeout: number,
  ttl: number,
  force: boolean,
  cache: DiskCache | null
): Promise<{ data: T; fetchedAt: number }> {
  // 1. Cache hit within TTL (unless force)
  if (!force && cache) {
    const cached = cache.read<T>(name);
    if (cached && Date.now() - cached.fetchedAt < ttl) {
      return { data: cached.data, fetchedAt: cached.fetchedAt };
    }
  }

  // 2. Try network fetch
  try {
    const data = await fetchJson<T>(url, timeout);
    const fetchedAt = Date.now();
    if (cache) {
      try {
        cache.write(name, data, url);
      } catch (_e) {
        // cache write failure is non-fatal
      }
    }
    return { data, fetchedAt };
  } catch (fetchErr) {
    // 3. Fallback to stale cache
    if (cache) {
      const stale = cache.read<T>(name);
      if (stale) {
        return { data: stale.data, fetchedAt: stale.fetchedAt };
      }
    }
    throw new DataUnavailableError(
      name,
      fetchErr instanceof Error ? fetchErr : undefined
    );
  }
}

export function getSymbols(): SymbolInfo[] {
  if (!state) {
    throw new NotInitializedError();
  }
  return state.symbols;
}

export function getHolidays(): Record<string, string[]> {
  if (!state) {
    throw new NotInitializedError();
  }
  return state.holidays;
}

/** Null when init() ran without `ratios: true`, or the file was unreachable. */
export function getRatios(): Record<string, SymbolRatios> | null {
  return state ? state.ratios : null;
}

export function isInitialized(): boolean {
  return state !== null;
}

export function _reset(): void {
  state = null;
}
