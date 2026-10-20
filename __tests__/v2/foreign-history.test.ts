import { createForeignHistory, isFinalCopy, monthsBetween } from "../../src/data/foreign";
import { createTransport } from "../../src/transport";
import { memoryStorage } from "../../src/storage";

const BASE = "https://data.test/foreign";
const HOUR = 3600 * 1000;

const row = (symbol: string, net: number) => [symbol, "HOSE", 100, 0, net, 0];
const month = (m: string, dates: string[]) => ({ month: m, unit: "VND", days: dates.map((date) => ({ date, rows: [row("FPT", 1000)], totals: {} })) });

function server(files: Record<string, unknown>) {
  const urls: string[] = [];
  let down = false;
  const fetch = async (url: any) => {
    urls.push(String(url).replace(BASE + "/", ""));
    if (down) throw new TypeError("fetch failed");
    const key = String(url).replace(BASE + "/", "");
    if (!(key in files)) return new Response("Not Found", { status: 404, statusText: "Not Found" });
    return new Response(JSON.stringify(files[key]));
  };
  return {
    urls,
    fetch: fetch as typeof globalThis.fetch,
    goDown() {
      down = true;
    },
  };
}

const FILES = {
  "index.json": { months: ["2026-09", "2026-10"] },
  "2026/09.json": month("2026-09", ["2026-09-14", "2026-09-30"]),
  "2026/10.json": month("2026-10", ["2026-10-01", "2026-10-13"]),
};

function history(srv: ReturnType<typeof server>, clock: { t: number }, storage = memoryStorage()) {
  return createForeignHistory({ transport: createTransport({ fetch: srv.fetch, retries: 0 }), storage, now: () => clock.t, baseUrl: BASE });
}

describe("monthsBetween", () => {
  it("lists months across a year end", () => {
    expect(monthsBetween("2025-11-20", "2026-02-03")).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
    expect(monthsBetween("2026-10-01", "2026-10-14")).toEqual(["2026-10"]);
  });
});

describe("isFinalCopy", () => {
  it("trusts a copy fetched from the 2nd of the next month on", () => {
    expect(isFinalCopy("2026-09", Date.parse("2026-10-01T22:00:00+07:00"))).toBe(false);
    expect(isFinalCopy("2026-09", Date.parse("2026-10-02T00:30:00+07:00"))).toBe(true);
    expect(isFinalCopy("2026-12", Date.parse("2027-01-02T08:00:00+07:00"))).toBe(true);
  });
});

describe("createForeignHistory", () => {
  it("returns the recorded days in the window, asking only for months in the index", async () => {
    const srv = server(FILES);
    const days = await history(srv, { t: Date.parse("2026-10-14T10:00:00+07:00") }).days("2026-08-15", "2026-10-01");
    expect(days.map((d) => d.date)).toEqual(["2026-09-14", "2026-09-30", "2026-10-01"]);
    expect(days[0].rows).toEqual([row("FPT", 1000)]);
    expect(srv.urls.sort()).toEqual(["2026/09.json", "2026/10.json", "index.json"]);
  });

  it("keeps a final month and refreshes the current month after an hour", async () => {
    const srv = server(FILES);
    const clock = { t: Date.parse("2026-10-14T10:00:00+07:00") };
    const h = history(srv, clock);
    await h.days("2026-09-01", "2026-10-14");
    await h.days("2026-09-01", "2026-10-14");
    expect(srv.urls).toHaveLength(3);
    clock.t += 2 * HOUR;
    await h.days("2026-09-01", "2026-10-14");
    expect(srv.urls.slice(3).sort()).toEqual(["2026/10.json", "index.json"]);
  });

  it("refetches stored copies dated in the future", async () => {
    const storage = memoryStorage();
    const clock = { t: Date.parse("2026-10-14T10:00:00+07:00") };
    const future = clock.t + 365 * 24 * HOUR;
    await storage.set("foreign:index", JSON.stringify({ fetchedAt: future, data: { months: ["2026-09"] } }));
    await storage.set("foreign:2026-09", JSON.stringify({ fetchedAt: future, data: month("2026-09", ["2026-09-01"]) }));
    const srv = server(FILES);
    const days = await history(srv, clock, storage).days("2026-09-01", "2026-10-14");
    expect(days.map((d) => d.date)).toEqual(["2026-09-14", "2026-09-30", "2026-10-01", "2026-10-13"]);
  });

  it("treats a listed month without a file as empty", async () => {
    const srv = server({ "index.json": { months: ["2026-10"] } });
    expect(await history(srv, { t: Date.parse("2026-10-14T10:00:00+07:00") }).days("2026-10-01", "2026-10-14")).toEqual([]);
  });

  it("returns nothing before the recorder has published an index", async () => {
    const srv = server({});
    expect(await history(srv, { t: Date.parse("2026-10-14T10:00:00+07:00") }).days("2026-10-01", "2026-10-14")).toEqual([]);
  });

  it("serves a stale copy when offline and fails without one", async () => {
    const storage = memoryStorage();
    const clock = { t: Date.parse("2026-10-14T10:00:00+07:00") };
    const srv = server(FILES);
    await history(srv, clock, storage).days("2026-10-01", "2026-10-14");
    srv.goDown();
    clock.t += 5 * HOUR;
    expect((await history(srv, clock, storage).days("2026-10-01", "2026-10-14")).map((d) => d.date)).toEqual(["2026-10-01", "2026-10-13"]);
    await expect(history(srv, clock).days("2026-10-01", "2026-10-14")).rejects.toMatchObject({ code: "DATA_UNAVAILABLE" });
  });
});
