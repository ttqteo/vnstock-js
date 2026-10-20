import { Transport } from "../transport";
import { ictDateTime, ictToday } from "../shared/time";

export type GoldSource = "btmc" | "giavangnet";

export interface GoldQuote {
  name: string;
  /** Source product code (GiaVang.net only). */
  code: string;
  karat: string;
  /** Dong per luong (37.5 g); null when the source lists no price. */
  buy: number | null;
  sell: number | null;
  buyChange: number | null;
  sellChange: number | null;
  /** ISO time in ICT. */
  updatedAt: string;
}

export interface GoldPrices {
  source: GoldSource;
  unit: "VND/luong";
  items: GoldQuote[];
}

export interface FxRate {
  currencyCode: string;
  currencyName: string;
  /** Dong per unit of the currency; null when the bank quotes none. */
  buyCash: number | null;
  buyTransfer: number | null;
  sell: number | null;
}

const BTMC_URL = "http://api.btmc.vn/api/BTMCAPI/getpricebtmc?key=3kd8ub1llcg9t45hnoh8hmn7t5kc2v";
const GIAVANG_CODES = [
  "XAUUSD",
  "USDX",
  "SJL1L10",
  "DOHNL",
  "DOHCML",
  "BTSJC",
  "PQHNVM",
  "VNGSJC",
  "VIETTINMSJC",
  "VNGN",
  "BT9999NTT",
  "PQHN24NTT",
  "DOJINHTV",
  "SJ9999",
];
const CHI_PER_LUONG = 10;
const GRAM_PER_LUONG = 37.5;

/** "12,300,000" or 12300 to a number; null for blanks, dashes and zero. */
function parseAmount(v: unknown): number | null {
  if (typeof v === "number") return isFinite(v) && v !== 0 ? v : null;
  if (typeof v !== "string") return null;
  const n = Number(v.replace(/,/g, "").trim());
  return v.trim() !== "" && isFinite(n) && n !== 0 ? n : null;
}

function scaled(v: unknown, factor: number): number | null {
  const n = parseAmount(v);
  return n === null ? null : Math.round(n * factor);
}

/** Luong in a product name: "5 LƯỢNG", "500 GRAM", "0,5 KG"; null when it names no weight. */
function luongInName(name: string): number | null {
  const n = (m: RegExpExecArray) => Number(m[1].replace(",", "."));
  const up = name.toUpperCase();
  let m = /(\d+(?:[.,]\d+)?)\s*LƯỢNG/.exec(up);
  if (m) return n(m);
  m = /(\d+(?:[.,]\d+)?)\s*GRAM/.exec(up);
  if (m) return n(m) / GRAM_PER_LUONG;
  m = /(\d+(?:[.,]\d+)?)\s*KG/.exec(up);
  if (m) return (n(m) * 1000) / GRAM_PER_LUONG;
  return null;
}

/** BTMC stamps "30/07/2026 09:41" in Vietnam time. */
function btmcTime(s: unknown): string {
  const m = typeof s === "string" ? /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})/.exec(s) : null;
  return m ? m[3] + "-" + m[2] + "-" + m[1] + "T" + m[4] + ":" + m[5] + ":00+07:00" : "";
}

async function goldBtmc(t: Transport): Promise<GoldQuote[]> {
  const raw = await t.request<any>({ url: BTMC_URL, method: "GET" });
  const list: any[] = (raw && raw.DataList && raw.DataList.Data) || [];
  const out: GoldQuote[] = [];
  const seen = new Set<string>();
  list.forEach((item, i) => {
    const k = (f: string) => item["@" + f + "_" + (i + 1)];
    const name: string = k("n") || "";
    const karat: string = k("k") || "";
    // The feed logs every update, newest first: keep the first row of each product.
    const key = name + "|" + karat + "|" + (k("h") || "");
    if (seen.has(key)) return;
    seen.add(key);
    // Coins ("ĐỒNG XU VRTL 0.1") are quoted per coin with no unit in the name, so they have no price per luong.
    if (/^ĐỒNG XU\b/i.test(name.trim())) return;
    // Gold quotes dong per chi; silver ("BẠC ...") quotes each product, so its price is
    // divided by the weight in its name.
    const silver = /^BẠC\s/i.test(name.trim());
    const luong = silver ? luongInName(name) : null;
    const factor = !silver ? CHI_PER_LUONG : luong ? 1 / luong : null;
    out.push({
      name,
      code: "",
      karat,
      buy: factor === null ? null : scaled(k("pb"), factor),
      sell: factor === null ? null : scaled(k("ps"), factor),
      buyChange: null,
      sellChange: null,
      updatedAt: btmcTime(k("d")),
    });
  });
  return out;
}

async function goldGiaVang(t: Transport): Promise<GoldQuote[]> {
  const url = "https://api2.giavang.net/v1/gold/last-price?" + GIAVANG_CODES.map((c) => "codes[]=" + c).join("&");
  const raw = await t.request<any>({ url, method: "GET" });
  const list: any[] = Array.isArray(raw && raw.data) ? raw.data : [];
  // GiaVang.net quotes thousand dong per chi.
  const factor = 1000 * CHI_PER_LUONG;
  return list.map((item) => ({
    name: item.type || "",
    code: item.type_code || "",
    karat: "",
    buy: scaled(item.buy, factor),
    sell: scaled(item.sell, factor),
    buyChange: typeof item.alter_buy === "number" ? Math.round(item.alter_buy * factor) : null,
    sellChange: typeof item.alter_sell === "number" ? Math.round(item.alter_sell * factor) : null,
    updatedAt: typeof item.update_time === "number" ? ictDateTime(item.update_time) : "",
  }));
}

/**
 * Domestic gold prices in dong per luong, from BTMC with GiaVang.net as the fallback.
 * @example
 * const { items } = await gold(transport);
 * items[0].sell // 125000000
 */
export async function gold(t: Transport, options: { source?: GoldSource | "auto" } = {}): Promise<GoldPrices> {
  const source = options.source ?? "auto";
  if (source === "giavangnet") return { source, unit: "VND/luong", items: await goldGiaVang(t) };
  if (source === "btmc") return { source, unit: "VND/luong", items: await goldBtmc(t) };
  try {
    return { source: "btmc", unit: "VND/luong", items: await goldBtmc(t) };
  } catch {
    return { source: "giavangnet", unit: "VND/luong", items: await goldGiaVang(t) };
  }
}

/**
 * Vietcombank exchange rates of one day, in dong.
 * @example
 * const usd = (await fx(transport)).find((r) => r.currencyCode === "USD");
 */
export async function fx(t: Transport, options: { date?: string; now?: number } = {}): Promise<FxRate[]> {
  const date = options.date || ictToday(options.now);
  const raw = await t.request<any>({ url: "https://www.vietcombank.com.vn/api/exchangerates?date=" + date, method: "GET" });
  const items: any[] = Array.isArray(raw && raw.Data) ? raw.Data : [];
  return items.map((it) => ({
    currencyCode: it.currencyCode || "",
    currencyName: it.currencyName || "",
    buyCash: parseAmount(it.cash),
    buyTransfer: parseAmount(it.transfer),
    sell: parseAmount(it.sell),
  }));
}
