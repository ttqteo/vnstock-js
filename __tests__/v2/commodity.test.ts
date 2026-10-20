import { gold, fx } from "../../src/client/commodity";
import { Transport } from "../../src/transport";

function transport(handler: (url: string) => unknown) {
  const urls: string[] = [];
  const t: Transport = {
    async request<T>(c: any): Promise<T> {
      urls.push(c.url);
      return handler(c.url) as T;
    },
  };
  return { t, urls };
}

// Captured 2026-07-30: BTMC quotes dong per chi, GiaVang.net thousand dong per chi; world 4064 USD/oz.
const BTMC = {
  DataList: {
    Data: [
      {
        "@n_1": "VÀNG MIẾNG SJC (Vàng SJC)",
        "@k_1": "24k",
        "@h_1": "999.9",
        "@pb_1": "12300000",
        "@ps_1": "12500000",
        "@pt_1": "4064",
        "@d_1": "30/07/2026 09:41",
      },
      { "@n_2": "NHẪN TRÒN TRƠN", "@k_2": "24k", "@h_2": "999.9", "@pb_2": "11,950,000", "@ps_2": "0", "@pt_2": "4064", "@d_2": "30/07/2026 09:41" },
    ],
  },
};
const GIAVANG = { data: [{ type_code: "VNGSJC", type: "VÀNG MIẾNG SJC", buy: 12300, sell: 12500, alter_buy: 30, alter_sell: 50, update_time: 1785405665 }] };

describe("gold", () => {
  it("returns BTMC prices in dong per luong", async () => {
    const { t } = transport(() => BTMC);
    const r = await gold(t);
    expect(r.source).toBe("btmc");
    expect(r.unit).toBe("VND/luong");
    expect(r.items[0]).toMatchObject({
      name: "VÀNG MIẾNG SJC (Vàng SJC)",
      karat: "24k",
      buy: 123000000,
      sell: 125000000,
      updatedAt: "2026-07-30T09:41:00+07:00",
    });
    for (const it of r.items) {
      if (it.buy === null) continue;
      expect(it.buy).toBeGreaterThan(5e7);
      expect(it.buy).toBeLessThan(5e8);
    }
    expect(r.items[1]).toMatchObject({ buy: 119500000, sell: null });
  });

  it("prices silver per luong from the weight in its name, keeps the newest row of each product and drops coins", async () => {
    // Captured 2026-10-20: BTMC lists the price of each silver product, not per chi, newest update first.
    const rows: [string, string, string, string, string][] = [
      ["BẠC MIẾNG PHÚ QUÝ Ag 999 1 LƯỢNG (PHÚ QUÝ)", "", "1991000", "2053000", "20/10/2026 10:36"],
      ["BẠC THỎI BẠC RỒNG THĂNG LONG Ag 999 0,5 KG (BẠC RỒNG THĂNG LONG Ag 999)", "", "26452672", "27519312", "20/10/2026 10:36"],
      ["BẠC THỎI 2025 ANCARAT 999 1 KG (1000 GRAM) (ANCARAT)", "", "52024000", "53634000", "20/10/2026 10:36"],
      ["BẠC THỎI 2025 ANCARAT 999 10 LƯỢNG (375 GRAM) (ANCARAT)", "", "19830000", "20450000", "20/10/2026 10:36"],
      ["BẠC MIẾNG PHÚ QUÝ Ag 999 1 LƯỢNG (PHÚ QUÝ)", "", "1989000", "2051000", "20/10/2026 10:32"],
      ["BẠC KHÔNG GHI TRỌNG LƯỢNG", "", "1000000", "1100000", "20/10/2026 10:32"],
      ["ĐỒNG XU VRTL 0.1 (Vàng Rồng Thăng Long)", "24k", "1380000", "1420000", "20/10/2026 09:04"],
      ["VÀNG MIẾNG SJC (Vàng SJC)", "24k", "13800000", "14200000", "20/10/2026 09:04"],
      ["VÀNG MIẾNG SJC (Vàng SJC)", "24k", "13700000", "14100000", "20/10/2026 08:30"],
    ];
    const Data = rows.map(([n, k, pb, ps, d], i) => ({
      ["@n_" + (i + 1)]: n,
      ["@k_" + (i + 1)]: k,
      ["@h_" + (i + 1)]: k ? "999.9" : "",
      ["@pb_" + (i + 1)]: pb,
      ["@ps_" + (i + 1)]: ps,
      ["@d_" + (i + 1)]: d,
    }));
    const r = await gold(transport(() => ({ DataList: { Data } })).t, { source: "btmc" });
    expect(r.items.map((x) => [x.name.substring(0, 24), x.buy, x.sell])).toEqual([
      ["BẠC MIẾNG PHÚ QUÝ Ag 999", 1991000, 2053000],
      ["BẠC THỎI BẠC RỒNG THĂNG ", 1983950, 2063948],
      ["BẠC THỎI 2025 ANCARAT 99", 1950900, 2011275],
      ["BẠC THỎI 2025 ANCARAT 99", 1983000, 2045000],
      ["BẠC KHÔNG GHI TRỌNG LƯỢN", null, null],
      ["VÀNG MIẾNG SJC (Vàng SJC", 138000000, 142000000],
    ]);
  });

  it("falls back to GiaVang.net and converts thousand dong per chi", async () => {
    const { t, urls } = transport((url) => {
      if (url.includes("btmc")) throw new Error("down");
      return GIAVANG;
    });
    const r = await gold(t);
    expect(r.source).toBe("giavangnet");
    expect(r.items[0]).toMatchObject({ code: "VNGSJC", buy: 123000000, sell: 125000000, buyChange: 300000, updatedAt: "2026-07-30T17:01:05+07:00" });
    expect(r.items[0].buy).toBeGreaterThan(5e7);
    expect(r.items[0].buy).toBeLessThan(5e8);
    expect(urls).toHaveLength(2);
  });

  it("honours an explicit source", async () => {
    const { t, urls } = transport(() => GIAVANG);
    expect((await gold(t, { source: "giavangnet" })).source).toBe("giavangnet");
    expect(urls.every((u) => u.includes("giavang"))).toBe(true);
  });
});

describe("fx", () => {
  it("returns Vietcombank rates as numbers in dong", async () => {
    const { t, urls } = transport(() => ({
      Data: [
        { currencyCode: "USD", currencyName: "US DOLLAR", cash: "25,880.00", transfer: "25,910.00", sell: "26,270.00" },
        { currencyCode: "KWD", currencyName: "KUWAITI DINAR", cash: "-", transfer: "84,500.12", sell: "87,800.00" },
      ],
    }));
    const rates = await fx(t, { date: "2026-10-14" });
    expect(urls[0]).toBe("https://www.vietcombank.com.vn/api/exchangerates?date=2026-10-14");
    expect(rates[0]).toEqual({ currencyCode: "USD", currencyName: "US DOLLAR", buyCash: 25880, buyTransfer: 25910, sell: 26270 });
    expect(rates[1].buyCash).toBeNull();
  });

  it("defaults to today in ICT", async () => {
    const { t, urls } = transport(() => ({ Data: [] }));
    await fx(t, { now: Date.parse("2026-10-14T18:00:00Z") });
    expect(urls[0]).toContain("date=2026-10-15");
  });
});

describe("gold edge cases (from the v1 gold tests)", () => {
  it("returns no items for an empty payload", async () => {
    expect((await gold(transport(() => ({ data: [] })).t, { source: "giavangnet" })).items).toEqual([]);
    expect((await gold(transport(() => ({})).t, { source: "btmc" })).items).toEqual([]);
  });

  it("does not fall back when BTMC is forced", async () => {
    const { t, urls } = transport((url) => {
      if (url.includes("btmc")) throw new Error("down");
      return GIAVANG;
    });
    await expect(gold(t, { source: "btmc" })).rejects.toThrow("down");
    expect(urls).toHaveLength(1);
  });

  it("keeps only the mapped fields", async () => {
    const [item] = (await gold(transport(() => ({ data: [{ ...GIAVANG.data[0], buy_min: 1, histories: [] }] })).t, { source: "giavangnet" })).items;
    expect(Object.keys(item).sort()).toEqual(["buy", "buyChange", "code", "karat", "name", "sell", "sellChange", "updatedAt"]);
  });
});
