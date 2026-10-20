import { intraday, intradayOf, MarketSource } from "../../src/client/market";
import { Bar, Quote } from "../../src/types";

const NOW = Date.parse("2026-10-14T03:00:00Z");

const m = (date: string, clock: string, close: number, value: number | null): Bar => ({
  time: date + "T" + clock + ":00+07:00",
  open: close,
  high: close,
  low: close,
  close,
  volume: 1,
  value,
});

const BARS = [
  m("2026-10-12", "14:45", 1700, 999),
  m("2026-10-13", "09:15", 1710, 100),
  m("2026-10-13", "09:16", 1711, 250),
  m("2026-10-13", "13:00", 1712, 400),
  m("2026-10-13", "14:45", 1713, 600),
  m("2026-10-14", "09:15", 1720, 120),
  m("2026-10-14", "09:17", 1721, 300),
  m("2026-10-14", "09:18", 1722, null),
  m("2026-10-14", "13:01", 1723, 500),
];

function quote(symbol: string, price: number, ref: number): Quote {
  return {
    symbol,
    name: symbol,
    nameEn: symbol,
    exchange: "HOSE",
    price,
    change: price - ref,
    changePct: 0,
    ref,
    ceiling: 0,
    floor: 0,
    high: 0,
    low: 0,
    avg: price,
    volume: 0,
    value: 0,
    foreignBuyVolume: 0,
    foreignSellVolume: 0,
    matchVolume: 0,
    bids: [],
    asks: [],
  };
}

describe("intradayOf", () => {
  it("follows the last session by minute against the previous one at the same clock time", () => {
    const d = intradayOf(BARS, "VNINDEX");
    expect(d.date).toBe("2026-10-14");
    expect(d.previousDate).toBe("2026-10-13");
    expect(d.points.map((p) => [p.time.substring(11, 16), p.close, p.value, p.valuePrevious])).toEqual([
      ["09:15", 1720, 120, 100],
      ["09:17", 1721, 300, 250],
      ["09:18", 1722, 300, 250],
      ["13:01", 1723, 500, 400],
    ]);
    expect(d.liquidity).toEqual({ value: 500, valuePrevious: 400, changePercent: 25, unit: "VND" });
    expect(d.unit).toBe("VND");
  });

  it("has no comparison for a lone session and refuses an empty series", () => {
    const d = intradayOf(BARS.slice(5), "VNINDEX");
    expect(d.previousDate).toBeNull();
    expect(d.points[0].valuePrevious).toBeNull();
    expect(d.liquidity).toMatchObject({ valuePrevious: null, changePercent: null });
    expect(() => intradayOf([], "VNINDEX")).toThrow("VNINDEX");
  });
});

describe("intraday", () => {
  it("reads two sessions of minute bars and the board breadth", async () => {
    const calls: any[] = [];
    const source: MarketSource = {
      async fetchBars(p) {
        calls.push(p);
        return { [p.symbols[0]]: BARS };
      },
      async fetchQuotes(symbols) {
        return symbols.map((s, i) => quote(s, i === 0 ? 11000 : 9000, 10000));
      },
      async fetchSymbolsByGroup() {
        return [{ symbol: "AAA" }, { symbol: "BBB" }];
      },
    };
    const d = await intraday(source, { now: NOW });
    expect(calls[0]).toMatchObject({ symbols: ["VNINDEX"], frame: "ONE_MINUTE", to: "2026-10-14" });
    expect(d.breadth).toMatchObject({ exchange: "HOSE", date: "2026-10-14", advancing: 1, declining: 1 });
    expect(d.liquidity.changePercent).toBe(25);
    await expect(intraday(source, { index: "FPT", now: NOW })).rejects.toMatchObject({ code: "INVALID_PARAMETER" });
  });
});
