import { VciAdapter } from "../../src/adapters/vci";
import { Transport } from "../../src/transport";

// Restated from the v1 cache test against an injected transport.

function counting(payload: unknown) {
  const calls: any[] = [];
  const transport: Transport = {
    async request<T>(c: any): Promise<T> {
      calls.push(c);
      return payload as T;
    },
  };
  return { calls, transport };
}

const ICB = { data: [{ name: "01", icbLevel: 1, viSector: "X", enSector: "X" }] };
const INDUSTRIES = [{ code: "VCB", name: "Vietcombank", icbLv1: {}, icbLv2: {}, icbLv3: {}, icbLv4: {} }];

describe("VciAdapter TTL cache", () => {
  it("serves a second ICB call from the cache", async () => {
    const { transport, calls } = counting(ICB);
    const adapter = new VciAdapter({ transport });
    await adapter.fetchIndustriesIcb();
    const after = calls.length;
    await adapter.fetchIndustriesIcb();
    expect(calls.length).toBe(after);
  });

  it("refetches every call with { cache: false }", async () => {
    const { transport, calls } = counting(ICB);
    const adapter = new VciAdapter({ transport, cache: false });
    await adapter.fetchIndustriesIcb();
    const after = calls.length;
    await adapter.fetchIndustriesIcb();
    expect(calls.length).toBe(after + 1);
  });

  it("caches symbols by industry per language", async () => {
    const { transport, calls } = counting(INDUSTRIES);
    const adapter = new VciAdapter({ transport });
    await adapter.fetchSymbolsByIndustries("vi");
    const after = calls.length;
    await adapter.fetchSymbolsByIndustries("vi");
    expect(calls.length).toBe(after);
    await adapter.fetchSymbolsByIndustries("en");
    expect(calls.length).toBe(after + 1);
    await adapter.fetchSymbolsByIndustries("en");
    expect(calls.length).toBe(after + 1);
  });

  it("refetches after clearCache()", async () => {
    const { transport, calls } = counting(ICB);
    const adapter = new VciAdapter({ transport });
    await adapter.fetchIndustriesIcb();
    const after = calls.length;
    adapter.clearCache();
    await adapter.fetchIndustriesIcb();
    expect(calls.length).toBe(after + 1);
  });

  it("refetches after the entry expires", async () => {
    jest.useFakeTimers();
    try {
      const { transport, calls } = counting(ICB);
      const adapter = new VciAdapter({ transport });
      await adapter.fetchIndustriesIcb();
      const after = calls.length;
      jest.setSystemTime(Date.now() + 61 * 60 * 1000);
      await adapter.fetchIndustriesIcb();
      expect(calls.length).toBe(after + 1);
    } finally {
      jest.useRealTimers();
    }
  });
});
