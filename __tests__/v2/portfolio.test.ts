import { checkPortfolio, valuePortfolio, PortfolioInput } from "../../src/compute/portfolio";
import { Quote } from "../../src/types";
import { SymbolInfo } from "../../src/models/normalized";

function quote(symbol: string, price: number, ref: number = price): Quote {
  return {
    symbol,
    name: symbol,
    nameEn: symbol,
    exchange: "HOSE",
    price,
    change: 0,
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

const info = (symbol: string, industry: string) => ({ symbol, industry }) as SymbolInfo;
const SYMBOLS = [info("VCB", "Ngân hàng"), info("FPT", "Công nghệ"), info("HPG", "Tài nguyên cơ bản")];
const QUOTES = [quote("VCB", 52000), quote("FPT", 0, 127000), quote("HPG", 26000)];

const INPUT: PortfolioInput = {
  positions: [
    { symbol: "VCB", quantity: 1000, cost: 50000, broker: "DNSE", note: "core" },
    { symbol: "fpt", quantity: 100, cost: 120000, broker: "DNSE" },
    { symbol: "HPG", quantity: 500, cost: 28000 },
  ],
  cash: { DNSE: 10000000, TCBS: 5000000 },
};

describe("valuePortfolio", () => {
  const p = valuePortfolio(INPUT, QUOTES, SYMBOLS, "2026-10-14");

  it("values each position at the last price, or the reference before the first match", () => {
    expect(p.positions.map((x) => [x.symbol, x.price, x.value, x.pnl, x.pnlPct, x.industry])).toEqual([
      ["VCB", 52000, 52000000, 2000000, 4, "Ngân hàng"],
      ["FPT", 127000, 12700000, 700000, 5.833, "Công nghệ"],
      ["HPG", 26000, 13000000, -1000000, -7.143, "Tài nguyên cơ bản"],
    ]);
    expect(p.positions[0].note).toBe("core");
    expect(p.positions[0].weight).toBeCloseTo(0.56095, 4);
  });

  it("totals value, cost, cash and NAV in dong", () => {
    expect(p.totals).toEqual({ value: 77700000, cost: 76000000, pnl: 1700000, pnlPct: 2.237, cash: 15000000, nav: 92700000 });
    expect(p.unit).toBe("VND");
    expect(p.date).toBe("2026-10-14");
  });

  it("splits by broker, with unassigned positions under default", () => {
    expect(p.byBroker.DNSE).toEqual({ value: 64700000, cost: 62000000, pnl: 2700000, pnlPct: 4.355, cash: 10000000, nav: 74700000 });
    expect(p.byBroker.default).toEqual({ value: 13000000, cost: 14000000, pnl: -1000000, pnlPct: -7.143, cash: 0, nav: 13000000 });
    expect(p.byBroker.TCBS).toEqual({ value: 0, cost: 0, pnl: 0, pnlPct: 0, cash: 5000000, nav: 5000000 });
  });

  it("splits by industry with weights of NAV", () => {
    expect(p.byIndustry["Ngân hàng"].value).toBe(52000000);
    expect(p.byIndustry["Tài nguyên cơ bản"].weight).toBeCloseTo(0.14024, 4);
  });

  it("puts cash given as one number under default", () => {
    const q = valuePortfolio({ positions: [], cash: 3000000 }, [], SYMBOLS, "2026-10-14");
    expect(q.totals).toEqual({ value: 0, cost: 0, pnl: 0, pnlPct: 0, cash: 3000000, nav: 3000000 });
    expect(q.byBroker.default.cash).toBe(3000000);
  });
});

function caught(fn: () => void): unknown {
  try {
    fn();
  } catch (err) {
    return err;
  }
  return undefined;
}

describe("checkPortfolio", () => {
  it("rejects bad positions and cash with a hint", () => {
    expect(caught(() => checkPortfolio({ positions: [{ symbol: "FPT", quantity: 0, cost: 1 }] }))).toMatchObject({
      code: "INVALID_PARAMETER",
      hint: expect.stringContaining("quantity"),
    });
    expect(caught(() => checkPortfolio({ positions: [{ symbol: "FPT", quantity: 1, cost: -5 }] }))).toMatchObject({ hint: expect.stringContaining("dong") });
    expect(caught(() => checkPortfolio({ positions: [], cash: { DNSE: "1" as any } }))).toMatchObject({ code: "INVALID_PARAMETER" });
    expect(caught(() => checkPortfolio({} as any))).toMatchObject({ code: "INVALID_PARAMETER" });
    expect(caught(() => checkPortfolio(INPUT))).toBeUndefined();
  });
});
