import { SymbolInfo } from "../models/normalized";
import { SymbolRatios } from "../models/ratios";

export interface InitOptions {
  symbolsUrl?: string;
  holidaysUrl?: string;
  ratiosUrl?: string;
  /**
   * Prebuilt quarterly fundamentals, used by screening to filter on ROE and
   * friends without one request per symbol. Off by default: most callers never
   * screen, and the file is another download.
   */
  ratios?: boolean;
  ttl?: number;
  force?: boolean;
  cacheDir?: string;
  noCache?: boolean;
  timeout?: number;
}

export interface CachedDataset<T> {
  data: T;
  fetchedAt: number;
  url: string;
}

export interface DataState {
  symbols: SymbolInfo[];
  holidays: Record<string, string[]>;
  ratios: Record<string, SymbolRatios> | null;
  symbolsFetchedAt: number;
  holidaysFetchedAt: number;
}

export interface CacheMeta {
  symbols?: { fetchedAt: number; url: string };
  holidays?: { fetchedAt: number; url: string };
  ratios?: { fetchedAt: number; url: string };
}
