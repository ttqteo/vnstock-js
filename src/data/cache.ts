import * as fs from "fs";
import * as path from "path";
import { CachedDataset, CacheMeta } from "./types";

type DatasetName = "symbols" | "holidays";

export class DiskCache {
  private readonly dir: string;

  constructor(dir: string) {
    this.dir = dir;
  }

  read<T>(name: DatasetName): CachedDataset<T> | null {
    const dataPath = path.join(this.dir, name + ".json");
    const metaPath = path.join(this.dir, "meta.json");

    if (!fs.existsSync(dataPath) || !fs.existsSync(metaPath)) {
      return null;
    }

    try {
      const raw = fs.readFileSync(dataPath, "utf8");
      const metaRaw = fs.readFileSync(metaPath, "utf8");
      const data = JSON.parse(raw) as T;
      const meta = JSON.parse(metaRaw) as CacheMeta;
      const entry = meta[name];
      if (!entry) return null;
      return { data, fetchedAt: entry.fetchedAt, url: entry.url };
    } catch (_err) {
      return null;
    }
  }

  write<T>(name: DatasetName, data: T, url: string): void {
    this.ensureDir();
    const dataPath = path.join(this.dir, name + ".json");
    const metaPath = path.join(this.dir, "meta.json");

    fs.writeFileSync(dataPath, JSON.stringify(data));

    let meta: CacheMeta = {};
    if (fs.existsSync(metaPath)) {
      try {
        meta = JSON.parse(fs.readFileSync(metaPath, "utf8")) as CacheMeta;
      } catch (_e) {
        meta = {};
      }
    }
    meta[name] = { fetchedAt: Date.now(), url };
    fs.writeFileSync(metaPath, JSON.stringify(meta));
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.dir)) {
      fs.mkdirSync(this.dir, { recursive: true });
    }
  }
}
