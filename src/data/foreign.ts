import { Transport } from "../transport";
import { Storage } from "../storage";
import { ApiError, DataUnavailableError } from "../errors";
import { ictToday } from "../shared/time";
import { DEFAULT_FOREIGN_BASE_URL, FOREIGN_TTL_MS } from "./urls";
import { Range } from "../types";
import { resolveWindow } from "../client/range";

/** [symbol, exchange, buyVolume, sellVolume, buyValue, sellValue], values in dong. */
export type ForeignRow = [string, string, number, number, number, number];

/** One recorded session. Symbols without foreign trades that day have no row. */
export interface ForeignDay {
  date: string;
  rows: ForeignRow[];
}

export interface ForeignHistory {
  /** Recorded sessions within [from, to], oldest first. Sessions before recording began are absent. */
  days(from: string, to: string): Promise<ForeignDay[]>;
}

export interface ForeignHistoryOptions {
  transport: Transport;
  storage: Storage;
  now: () => number;
  /** Folder holding index.json and YYYY/MM.json. Default data/foreign of the repository on GitHub. */
  baseUrl?: string;
}

interface MonthFile {
  days?: { date: string; rows: ForeignRow[] }[];
}

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
 * YYYY-MM of every month touched by an inclusive date window.
 * @example
 * monthsBetween("2025-12-20", "2026-01-05") // ["2025-12", "2026-01"]
 */
export function monthsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  let [y, m] = from.substring(0, 7).split("-").map(Number);
  const end = to.substring(0, 7);
  for (;;) {
    const cur = y + "-" + String(m).padStart(2, "0");
    if (cur > end) break;
    out.push(cur);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

/**
 * A month copy is final once fetched on or after the 2nd of the next month in ICT; the recorder
 * may run late on the last trading day.
 * @example
 * isFinalCopy("2026-09", Date.parse("2026-10-02T08:00:00+07:00")) // true
 */
export function isFinalCopy(month: string, fetchedAt: number): boolean {
  const [y, m] = month.split("-").map(Number);
  const next = m === 12 ? y + 1 + "-01-01" : y + "-" + String(m + 1).padStart(2, "0") + "-01";
  return ictToday(fetchedAt) > next;
}

/**
 * Reads the daily foreign flow recordings month by month through a Storage cache. A month that is
 * missing upstream counts as empty; when the network fails a stale copy is served.
 * @example
 * const h = createForeignHistory({ transport: createTransport(), storage: memoryStorage(), now: Date.now });
 * const days = await h.days("2026-10-01", "2026-10-14");
 */
export function createForeignHistory(o: ForeignHistoryOptions): ForeignHistory {
  const base = (o.baseUrl || DEFAULT_FOREIGN_BASE_URL).replace(/\/$/, "");
  const inflight = new Map<string, Promise<unknown>>();
  const recent = (s: Stored<unknown>) => o.now() - s.fetchedAt < FOREIGN_TTL_MS;

  async function load<T>(key: string, url: string, fresh: (s: Stored<T>) => boolean, missing: T): Promise<T> {
    const cached = parseStored<T>(await o.storage.get(key).catch(() => null));
    // A copy dated in the future is not fresh, or it would never expire.
    if (cached && cached.fetchedAt <= o.now() && fresh(cached)) return cached.data;
    try {
      const data = await o.transport.request<T>({ url, method: "GET" });
      await o.storage.set(key, JSON.stringify({ fetchedAt: o.now(), data })).catch(() => undefined);
      return data;
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 404) return missing;
      if (cached) return cached.data;
      throw new DataUnavailableError("foreign", err instanceof Error ? err : undefined);
    }
  }

  // Shares a request in flight; settled results live in the Storage cache, not here.
  function shared<T>(key: string, run: () => Promise<T>): Promise<T> {
    let p = inflight.get(key) as Promise<T> | undefined;
    if (!p) {
      p = run();
      inflight.set(key, p);
      const clear = () => inflight.delete(key);
      p.then(clear, clear);
    }
    return p;
  }

  return {
    async days(from, to) {
      const index = await shared("index", () => load<{ months?: string[] }>("foreign:index", base + "/index.json", recent, { months: [] }));
      const listed = (index && index.months) || [];
      const months = monthsBetween(from, to).filter((m) => listed.includes(m));
      const files = await Promise.all(
        months.map((month) =>
          shared(month, () =>
            load<MonthFile | null>(
              "foreign:" + month,
              base + "/" + month.replace("-", "/") + ".json",
              (s) => isFinalCopy(month, s.fetchedAt) || recent(s),
              null
            )
          )
        )
      );
      const out: ForeignDay[] = [];
      for (const f of files) {
        for (const d of (f && f.days) || []) if (d.date >= from && d.date <= to) out.push({ date: d.date, rows: d.rows });
      }
      return out;
    },
  };
}

/**
 * Recorded sessions for a range or dates; "1d" and "5d" keep the last 1 or 5 sessions like history().
 * @example
 * const days = await daysFor(history, "1mo", Date.now());
 */
export async function daysFor(history: ForeignHistory, input: Range | { from: string; to?: string }, now: number): Promise<ForeignDay[]> {
  const win = resolveWindow(input, now);
  const days = await history.days(win.from, win.to);
  if (input === "1d") return days.slice(-1);
  if (input === "5d") return days.slice(-5);
  return days;
}
