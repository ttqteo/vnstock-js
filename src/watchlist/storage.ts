export interface WatchlistStorage {
  read(): Promise<string | null>;
  write(json: string): Promise<void>;
}

class NodeFileStorage implements WatchlistStorage {
  private filePath: string;
  private fs: any;
  private path: any;
  private os: any;

  constructor() {
    this.fs = require("fs");
    this.path = require("path");
    this.os = require("os");
    var home = this.os.homedir();
    var dir = this.path.join(home, ".vnstock-js");
    if (!this.fs.existsSync(dir)) this.fs.mkdirSync(dir, { recursive: true });
    this.filePath = this.path.join(dir, "watchlist.json");
  }

  async read(): Promise<string | null> {
    if (!this.fs.existsSync(this.filePath)) return null;
    try {
      var content = this.fs.readFileSync(this.filePath, "utf8");
      JSON.parse(content);
      return content;
    } catch (e) {
      return null;
    }
  }

  async write(json: string): Promise<void> {
    var tmp = this.filePath + ".tmp";
    this.fs.writeFileSync(tmp, json, "utf8");
    this.fs.renameSync(tmp, this.filePath);
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
