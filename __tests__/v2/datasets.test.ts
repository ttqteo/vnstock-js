import { createDatasets } from "../../src/data/datasets";
import { memoryStorage, Storage } from "../../src/storage";
import { DataUnavailableError } from "../../src/errors";

function fakeTransport(payloads: Record<string, unknown>, calls: string[]) {
  return {
    async request(c: any) {
      calls.push(c.url);
      if (!(c.url in payloads)) throw new Error("offline");
      return payloads[c.url];
    },
  } as any;
}

const URLS = { symbols: "https://raw.test/symbols.json", holidays: "https://raw.test/holidays.json", ratios: "https://raw.test/ratios.json" };

describe("datasets", () => {
  it("loads on first use and only once", async () => {
    const calls: string[] = [];
    const ds = createDatasets({ transport: fakeTransport({ [URLS.symbols]: [{ symbol: "FPT" }] }, calls), storage: memoryStorage(), urls: URLS });
    expect(calls).toEqual([]);
    const [a, b] = await Promise.all([ds.symbols(), ds.symbols()]);
    expect(a).toEqual([{ symbol: "FPT" }]);
    expect(b).toBe(a);
    expect(await ds.symbols()).toBe(a);
    expect(calls).toEqual([URLS.symbols]);
  });

  it("writes what it fetched to storage", async () => {
    const storage = memoryStorage();
    const ds = createDatasets({ transport: fakeTransport({ [URLS.holidays]: { "2026": [] } }, []), storage, urls: URLS });
    await ds.holidays();
    const saved = JSON.parse((await storage.get("dataset:holidays")) as string);
    expect(saved.data).toEqual({ "2026": [] });
    expect(typeof saved.fetchedAt).toBe("number");
  });

  it("serves from storage within the TTL", async () => {
    const storage = memoryStorage();
    await storage.set("dataset:symbols", JSON.stringify({ fetchedAt: Date.now(), data: [{ symbol: "VCB" }] }));
    const calls: string[] = [];
    const ds = createDatasets({ transport: fakeTransport({}, calls), storage, urls: URLS });
    expect(await ds.symbols()).toEqual([{ symbol: "VCB" }]);
    expect(calls).toEqual([]);
  });

  it("refreshes after the TTL", async () => {
    const storage = memoryStorage();
    await storage.set("dataset:symbols", JSON.stringify({ fetchedAt: Date.now() - 2000, data: [{ symbol: "OLD" }] }));
    const ds = createDatasets({ transport: fakeTransport({ [URLS.symbols]: [{ symbol: "NEW" }] }, []), storage, urls: URLS, ttl: 1000 });
    expect(await ds.symbols()).toEqual([{ symbol: "NEW" }]);
  });

  it("refetches a stored copy dated in the future instead of trusting it forever", async () => {
    const storage = memoryStorage();
    await storage.set("dataset:symbols", JSON.stringify({ fetchedAt: Date.now() + 365 * 86400000, data: [{ symbol: "FAKE" }] }));
    const ds = createDatasets({ transport: fakeTransport({ [URLS.symbols]: [{ symbol: "FPT" }] }, []), storage, urls: URLS });
    expect(await ds.symbols()).toEqual([{ symbol: "FPT" }]);
  });

  it("falls back to stale storage when offline", async () => {
    const storage = memoryStorage();
    await storage.set("dataset:holidays", JSON.stringify({ fetchedAt: 0, data: { "2026": ["2026-01-01"] } }));
    const ds = createDatasets({ transport: fakeTransport({}, []), storage, urls: URLS });
    expect(await ds.holidays()).toEqual({ "2026": ["2026-01-01"] });
  });

  it("ignores a corrupt storage entry", async () => {
    const storage = memoryStorage();
    await storage.set("dataset:symbols", "{not json");
    const ds = createDatasets({ transport: fakeTransport({ [URLS.symbols]: [{ symbol: "FPT" }] }, []), storage, urls: URLS });
    expect(await ds.symbols()).toEqual([{ symbol: "FPT" }]);
  });

  it("still returns fetched data when storage cannot write", async () => {
    const broken: Storage = {
      get: async () => null,
      set: async () => {
        throw new Error("read-only");
      },
      remove: async () => undefined,
    };
    const ds = createDatasets({ transport: fakeTransport({ [URLS.symbols]: [{ symbol: "FPT" }] }, []), storage: broken, urls: URLS });
    expect(await ds.symbols()).toEqual([{ symbol: "FPT" }]);
  });

  it("throws DataUnavailableError with a hint when nothing is available, and retries next time", async () => {
    const payloads: Record<string, unknown> = {};
    const ds = createDatasets({ transport: fakeTransport(payloads, []), storage: memoryStorage(), urls: URLS });
    const err: any = await ds.symbols().catch((e: any) => e);
    expect(err).toBeInstanceOf(DataUnavailableError);
    expect(err.hint).toMatch(/raw.githubusercontent.com/);
    payloads[URLS.symbols] = [{ symbol: "FPT" }];
    expect(await ds.symbols()).toEqual([{ symbol: "FPT" }]);
  });

  it("indexes ratios by symbol", async () => {
    const file = { generatedAt: "2026-10-01", count: 1, ratios: [{ symbol: "FPT", roe: 0.25 }] };
    const ds = createDatasets({ transport: fakeTransport({ [URLS.ratios]: file }, []), storage: memoryStorage(), urls: URLS });
    expect(await ds.ratios()).toEqual({ FPT: { symbol: "FPT", roe: 0.25 } });
  });

  it("treats ratios as optional", async () => {
    const ds = createDatasets({ transport: fakeTransport({}, []), storage: memoryStorage(), urls: URLS });
    expect(await ds.ratios()).toBeNull();
  });
});
