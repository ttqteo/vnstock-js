import { SymbolInfo } from "../models/normalized";

export interface InitOptions {
  symbolsUrl?: string;
  holidaysUrl?: string;
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
  symbolsFetchedAt: number;
  holidaysFetchedAt: number;
}

export interface CacheMeta {
  symbols?: { fetchedAt: number; url: string };
  holidays?: { fetchedAt: number; url: string };
}
