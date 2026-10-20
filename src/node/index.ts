import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { Storage } from "../storage";

export type { Storage } from "../storage";

export function defaultDir(): string {
  return path.join(os.homedir(), ".vnstock-js");
}

/**
 * Temp directory used when the storage directory cannot be created; per user where the OS has uids.
 * @example
 * fallbackDir(); // "/tmp/vnstock-js-1000" on Linux
 */
export function fallbackDir(): string {
  const uid = typeof process.getuid === "function" ? process.getuid() : null;
  return path.join(os.tmpdir(), uid === null ? "vnstock-js" : "vnstock-js-" + uid);
}

/**
 * True when only this user can write to `dir`. A shared /tmp lets anyone create the fallback
 * directory first and plant cache files in it. Windows has per-user temp directories and no uid.
 */
function isPrivate(dir: string): boolean {
  if (typeof process.getuid !== "function") return true;
  try {
    const st = fs.statSync(dir);
    return st.uid === process.getuid() && (st.mode & 0o022) === 0;
  } catch {
    return false;
  }
}

/**
 * Storage in one JSON file per key. Nothing touches the disk until the first write; writes go
 * to a temp file then rename, and a directory that cannot be created falls back to the OS temp
 * directory (serverless hosts have no writable home).
 * @example
 * const storage = fileStorage(); // ~/.vnstock-js
 */
export function fileStorage(dir: string = defaultDir()): Storage {
  let resolved: string | null = null;
  function ensureDir(): string {
    if (resolved) return resolved;
    try {
      fs.mkdirSync(dir, { recursive: true });
      resolved = dir;
    } catch {
      const tmp = fallbackDir();
      fs.mkdirSync(tmp, { recursive: true, mode: 0o700 });
      if (!isPrivate(tmp)) throw new Error("Refusing to use " + tmp + ": other users can write to it");
      resolved = tmp;
    }
    return resolved;
  }
  const fileFor = (base: string, key: string) => path.join(base, encodeURIComponent(key) + ".json");
  // Reads and removes look in both places, since an earlier write may have fallen back.
  const candidates = (key: string) => {
    const tmp = fallbackDir();
    return isPrivate(tmp) ? [fileFor(resolved || dir, key), fileFor(tmp, key)] : [fileFor(resolved || dir, key)];
  };
  return {
    async get(key) {
      for (const file of candidates(key)) {
        try {
          return fs.readFileSync(file, "utf8");
        } catch {
          // try the next location
        }
      }
      return null;
    },
    async set(key, value) {
      const file = fileFor(ensureDir(), key);
      const tmp = file + "." + process.pid + ".tmp";
      fs.writeFileSync(tmp, value);
      fs.renameSync(tmp, file);
    },
    async remove(key) {
      for (const file of candidates(key)) {
        try {
          fs.unlinkSync(file);
        } catch {
          // already gone
        }
      }
    },
  };
}
