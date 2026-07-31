import axios from "axios";
import { VciAdapter } from "../src/adapters/vci";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Handshake is a module-level singleton that gets set true after first test. Mock it
// generously so any handshake call still resolves, but don't assert its count.
function setupMocks(icbData: any[] = [{ name: "01", icbLevel: 1, viSector: "X", enSector: "X" }]) {
  mockedAxios.request.mockResolvedValue({
    data: Array.isArray(icbData) ? { data: icbData } : icbData,
    headers: {},
  });
}

describe("VciAdapter TTL cache", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("fetchIndustriesIcb()", () => {
    it("second call hits cache (no additional axios.request)", async () => {
      const adapter = new VciAdapter();
      setupMocks();
      await adapter.fetchIndustriesIcb();
      const callsAfterFirst = mockedAxios.request.mock.calls.length;
      await adapter.fetchIndustriesIcb();
      expect(mockedAxios.request.mock.calls.length).toBe(callsAfterFirst);
    });

    it("opt-out via { cache: false } refetches every call", async () => {
      const adapter = new VciAdapter({ cache: false });
      setupMocks();
      await adapter.fetchIndustriesIcb();
      const callsAfterFirst = mockedAxios.request.mock.calls.length;
      await adapter.fetchIndustriesIcb();
      expect(mockedAxios.request.mock.calls.length).toBe(callsAfterFirst + 1);
    });
  });

  describe("fetchSymbolsByIndustries()", () => {
    it("caches per language", async () => {
      const adapter = new VciAdapter();
      setupMocks([{ code: "VCB", name: "Vietcombank", icbLv1: {}, icbLv2: {}, icbLv3: {}, icbLv4: {} }]);
      mockedAxios.request.mockResolvedValue({
        data: [{ code: "VCB", name: "Vietcombank", icbLv1: {}, icbLv2: {}, icbLv3: {}, icbLv4: {} }],
        headers: {},
      });

      await adapter.fetchSymbolsByIndustries("vi");
      const callsAfterFirst = mockedAxios.request.mock.calls.length;
      await adapter.fetchSymbolsByIndustries("vi");
      expect(mockedAxios.request.mock.calls.length).toBe(callsAfterFirst);

      await adapter.fetchSymbolsByIndustries("en");
      expect(mockedAxios.request.mock.calls.length).toBe(callsAfterFirst + 1);

      await adapter.fetchSymbolsByIndustries("en");
      expect(mockedAxios.request.mock.calls.length).toBe(callsAfterFirst + 1);
    });
  });

  describe("clearCache()", () => {
    it("forces refetch after clear", async () => {
      const adapter = new VciAdapter();
      setupMocks();
      await adapter.fetchIndustriesIcb();
      const callsAfterFirst = mockedAxios.request.mock.calls.length;
      adapter.clearCache();
      await adapter.fetchIndustriesIcb();
      expect(mockedAxios.request.mock.calls.length).toBe(callsAfterFirst + 1);
    });
  });

  describe("TTL expiration", () => {
    it("refetches after entry expires", async () => {
      jest.useFakeTimers();
      try {
        const adapter = new VciAdapter();
        setupMocks();
        await adapter.fetchIndustriesIcb();
        const callsAfterFirst = mockedAxios.request.mock.calls.length;
        jest.setSystemTime(Date.now() + 61 * 60 * 1000);
        await adapter.fetchIndustriesIcb();
        expect(mockedAxios.request.mock.calls.length).toBe(callsAfterFirst + 1);
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
