import axios from "axios";
import { GoldService } from "../src/core/commodity/gold";
import Commodity from "../src/core/commodity";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

// 1785405665 = 2026-07-30 09:41 UTC; mid-day UTC so the formatted date is
// stable across CI (UTC) and local (UTC+7) timezones
const giavangItem = {
  id: 546,
  type_code: "VNGSJC",
  type: "VÀNG MIẾNG SJC",
  buy: 12300,
  sell: 12500,
  alter_buy: 30,
  alter_sell: 50,
  buy_min: 12250,
  buy_max: 12350,
  update_time: 1785405665,
  histories: [],
};

const btmcItem = {
  "@n_1": "VÀNG MIẾNG SJC (Vàng SJC)",
  "@k_1": "24k",
  "@h_1": "999.9",
  "@pb_1": "12300000",
  "@ps_1": "12500000",
  "@pt_1": "4064",
  "@d_1": "30/07/2026 09:41",
};

function mockBySource(handlers: { btmc?: () => Promise<any>; giavang?: () => Promise<any> }) {
  mockedAxios.request.mockImplementation((config: any) => {
    if (typeof config.url === "string" && config.url.indexOf("btmc.vn") !== -1 && handlers.btmc) {
      return handlers.btmc();
    }
    if (typeof config.url === "string" && config.url.indexOf("giavang.net") !== -1 && handlers.giavang) {
      return handlers.giavang();
    }
    return Promise.reject(new Error("unexpected url: " + config.url));
  });
}

describe("GoldService (mocked)", () => {
  let gold: GoldService;

  beforeEach(() => {
    jest.clearAllMocks();
    gold = new GoldService();
  });

  describe("goldPriceGiaVangNet", () => {
    it("normalizes raw items to camelCase with ISO date", async () => {
      mockBySource({ giavang: () => Promise.resolve({ data: { status: 200, data: [giavangItem] }, headers: {} }) });
      const data = await gold.goldPriceGiaVangNet();
      expect(data.length).toBe(1);
      expect(data[0]).toEqual({
        code: "VNGSJC",
        name: "VÀNG MIẾNG SJC",
        buyPrice: 12300,
        sellPrice: 12500,
        buyChange: 30,
        sellChange: 50,
        updatedAt: "2026-07-30",
      });
    });

    it("drops unmapped fields like histories and buy_min", async () => {
      mockBySource({ giavang: () => Promise.resolve({ data: { status: 200, data: [giavangItem] }, headers: {} }) });
      const data = await gold.goldPriceGiaVangNet();
      expect(data[0]).not.toHaveProperty("type_code");
      expect(data[0]).not.toHaveProperty("histories");
      expect(data[0]).not.toHaveProperty("buy_min");
      expect(data[0]).not.toHaveProperty("update_time");
    });

    it("returns empty array when payload has no data", async () => {
      mockBySource({ giavang: () => Promise.resolve({ data: { status: 200, data: [] }, headers: {} }) });
      const data = await gold.goldPriceGiaVangNet();
      expect(data).toEqual([]);
    });
  });

  describe("goldPrice", () => {
    it("returns BTMC data with source btmc when BTMC succeeds", async () => {
      mockBySource({ btmc: () => Promise.resolve({ data: { DataList: { Data: [btmcItem] } }, headers: {} }) });
      const result = await gold.goldPrice();
      expect(result.source).toBe("btmc");
      expect(result.data.length).toBe(1);
      expect(result.data[0]).toHaveProperty("buyPrice");
      expect(result.data[0]).toHaveProperty("karat");
    });

    it("falls back to GiaVang.net with source giavangnet when BTMC fails", async () => {
      mockBySource({
        btmc: () => Promise.reject(new Error("socket hang up")),
        giavang: () => Promise.resolve({ data: { status: 200, data: [giavangItem] }, headers: {} }),
      });
      const result = await gold.goldPrice();
      expect(result.source).toBe("giavangnet");
      expect(result.data.length).toBe(1);
      expect(result.data[0]).toHaveProperty("code", "VNGSJC");
    });

    it("source btmc forces BTMC and does not fall back", async () => {
      mockBySource({
        btmc: () => Promise.reject(new Error("socket hang up")),
        giavang: () => Promise.resolve({ data: { status: 200, data: [giavangItem] }, headers: {} }),
      });
      await expect(gold.goldPrice({ source: "btmc" })).rejects.toThrow();
    });

    it("source giavangnet skips BTMC entirely", async () => {
      mockBySource({ giavang: () => Promise.resolve({ data: { status: 200, data: [giavangItem] }, headers: {} }) });
      const result = await gold.goldPrice({ source: "giavangnet" });
      expect(result.source).toBe("giavangnet");
      const urls = mockedAxios.request.mock.calls.map((c: any) => c[0].url);
      expect(urls.some((u: string) => u.indexOf("btmc.vn") !== -1)).toBe(false);
    });
  });

  describe("Commodity wrapper", () => {
    it("goldPrice delegates to GoldService with auto fallback", async () => {
      mockBySource({
        btmc: () => Promise.reject(new Error("socket hang up")),
        giavang: () => Promise.resolve({ data: { status: 200, data: [giavangItem] }, headers: {} }),
      });
      const result = await new Commodity().goldPrice();
      expect(result.source).toBe("giavangnet");
      expect(result.data[0]).toHaveProperty("code", "VNGSJC");
    });
  });
});
