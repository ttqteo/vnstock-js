import { buildContext, contextPrompt, priceLabel } from "../../src/client/context";
import { InvalidParameterError } from "../../src/errors";
import { Bar } from "../../src/types";
import { BarsParams } from "../../src/adapters/types";

const NOW = Date.parse("2026-10-14T03:00:00Z");

function trend(n: number, start: number, step: number): Bar[] {
  const out: Bar[] = [];
  let p = start;
  const t0 = Date.UTC(2026, 0, 1);
  for (let i = 0; i < n; i++) {
    const next = p * (1 + step);
    out.push({
      time: new Date(t0 + i * 86400000).toISOString().substring(0, 10),
      open: p,
      high: next * 1.005,
      low: p * 0.995,
      close: next,
      volume: 1000 + (i % 7) * 100,
      value: null,
    });
    p = next;
  }
  return out;
}

function fakeSource(bars: Record<string, Bar[]>) {
  const calls: BarsParams[] = [];
  return {
    calls,
    async fetchBars(params: BarsParams) {
      calls.push(params);
      const out: Record<string, Bar[]> = {};
      for (const s of params.symbols) out[s] = bars[s] || [];
      return out;
    },
  };
}

describe("buildContext", () => {
  it("reads daily bars up to today and keeps the last `lookback`", async () => {
    const src = fakeSource({ FPT: trend(260, 100000, 0.002) });
    const ctx = await buildContext(src, "fpt", { lookback: 200, now: NOW });
    expect(src.calls[0]).toMatchObject({ symbols: ["FPT"], to: "2026-10-14", frame: "ONE_DAY", countBack: 230 });
    expect(src.calls[0].from < "2026-01-01").toBe(true);
    expect(ctx.symbol).toBe("FPT");
    expect(ctx.asOf).toBe("2026-09-17");
    expect(ctx.trend.direction).toBe("bullish");
    expect(ctx.indicators.sma[20]).toBeGreaterThan(100000);
    expect(ctx.levels.support.every((v) => v > 1000)).toBe(true);
  });

  it("anchors the window at asOf and ignores later bars", async () => {
    const src = fakeSource({ FPT: trend(260, 100000, 0.002) });
    const ctx = await buildContext(src, "FPT", { asOf: "2026-06-30", now: NOW });
    expect(src.calls[0].to).toBe("2026-06-30");
    expect(ctx.asOf).toBe("2026-06-30");
  });

  it("gives the same trend strength for a stock in dong and the same shape in thousands", async () => {
    const dong = await buildContext(fakeSource({ FPT: trend(260, 100000, 0.002) }), "FPT", { now: NOW });
    const thousands = await buildContext(fakeSource({ FPT: trend(260, 100, 0.002) }), "FPT", { now: NOW });
    expect(dong.trend.strength).toBeCloseTo(thousands.trend.strength, 6);
  });

  it("rejects a malformed asOf and a bad lookback", async () => {
    const src = fakeSource({});
    await expect(buildContext(src, "FPT", { asOf: "30/06/2026" })).rejects.toBeInstanceOf(InvalidParameterError);
    await expect(buildContext(src, "FPT", { lookback: 0 })).rejects.toBeInstanceOf(InvalidParameterError);
  });

  it("returns an empty context when the source has no bars", async () => {
    const ctx = await buildContext(fakeSource({}), "XYZ", { now: NOW });
    expect(ctx.asOf).toBe("");
    expect(ctx.trend.direction).toBe("neutral");
  });
});

describe("priceLabel", () => {
  it("prints stock prices in thousands of dong and index levels in points", () => {
    expect(priceLabel(125800, "FPT")).toBe("125.8k");
    expect(priceLabel(5230, "HQC")).toBe("5.23k");
    expect(priceLabel(1234567, "FPT")).toBe("1,234.57k");
    expect(priceLabel(1748.861, "VNINDEX")).toBe("1,748.86");
  });
});

describe("contextPrompt", () => {
  it("formats prices as thousands instead of raw dong", async () => {
    const ctx = await buildContext(fakeSource({ FPT: trend(260, 100000, 0.002) }), "FPT", { now: NOW });
    const vi = contextPrompt(ctx);
    expect(vi).toMatch(/SMA: 20=[\d.,]+k/);
    expect(vi).not.toMatch(/\d{5,}\.\d{2}/);
    expect(contextPrompt(ctx, "en")).toMatch(/^=== FPT · /);
  });

  it("prints index levels in points", async () => {
    const ctx = await buildContext(fakeSource({ VNINDEX: trend(260, 1200, 0.001) }), "VNINDEX", { now: NOW });
    const out = contextPrompt(ctx);
    expect(out).toMatch(/SMA: 20=1,\d{3}\.\d{2},/);
    expect(out).not.toMatch(/SMA: 20=[\d.,]+k/);
  });
});
