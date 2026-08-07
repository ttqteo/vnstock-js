export interface WatchlistStorage {
  read(): Promise<string | null>;
  write(json: string): Promise<void>;
}

class NodeFileStorage implements WatchlistStorage {
  private fs: any;
  private path: any;
  private os: any;
  private dir: string | null = null;
  private filePath: string | null = null;

  /**
   * No filesystem work here on purpose. `index.ts` instantiates Watchlist at
   * import time, so touching the disk in this constructor crashes every
   * serverless import (Lambda/Vercel have no writable home directory) even
   * for callers that never use the watchlist.
   */
  constructor() {
    this.fs = require("fs");
    this.path = require("path");
    this.os = require("os");
  }

  private resolve(): string {
    if (this.filePath) return this.filePath;
    var home: string;
    try {
      home = this.os.homedir();
    } catch (e) {
      home = this.os.tmpdir();
    }
    this.dir = this.path.join(home, ".vnstock-js");
    this.filePath = this.path.join(this.dir, "watchlist.json");
    return this.filePath as string;
  }

  /** Falls back to the temp directory when home is missing or read-only. */
  private ensureDir(): void {
    try {
      if (!this.fs.existsSync(this.dir)) this.fs.mkdirSync(this.dir, { recursive: true });
      return;
    } catch (e) {
      // fall through to tmpdir
    }
    this.dir = this.path.join(this.os.tmpdir(), "vnstock-js");
    this.filePath = this.path.join(this.dir, "watchlist.json");
    if (!this.fs.existsSync(this.dir)) this.fs.mkdirSync(this.dir, { recursive: true });
  }

  async read(): Promise<string | null> {
    var p = this.resolve();
    try {
      if (!this.fs.existsSync(p)) return null;
      var content = this.fs.readFileSync(p, "utf8");
      JSON.parse(content);
      return content;
    } catch (e) {
      return null;
    }
  }

  async write(json: string): Promise<void> {
    this.resolve();
    this.ensureDir();
    var target = this.filePath as string;
    var tmp = target + ".tmp";
    this.fs.writeFileSync(tmp, json, "utf8");
    this.fs.renameSync(tmp, target);
  }
}

class BrowserNoopStorage implements WatchlistStorage {
  private warned = false;

  async read(): Promise<string | null> {
    this.warn();
    return null;
  }

  async write(_json: string): Promise<void> {
    this.warn();
  }

  private warn() {
    if (this.warned) return;
    this.warned = true;
    if (typeof console !== "undefined" && console.warn) {
      console.warn(
        "[vnstock-js] Watchlist persistence is not available in browser. " +
          "Inject custom storage via vnstock.watchlist.setStorage(adapter)."
      );
    }
  }
}

export function defaultStorage(): WatchlistStorage {
  var isNode =
    typeof process !== "undefined" &&
    process.versions != null &&
    process.versions.node != null;
  return isNode ? new NodeFileStorage() : new BrowserNoopStorage();
}
