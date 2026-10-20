import { classifyTrend, snapshotIndicators, classifyVolume, computePerformance, formatAIPrompt } from "../src/core/stock/ai-context";
import { detectPivots } from "../src/core/stock/pivot";
import { Bar } from "../src/types";
import { buildContext } from "../src/client/context";

function makeUptrend(n: number): Bar[] {
  const data: Bar[] = [];
  for (let i = 0; i < n; i++) {
    const base = 100 + i * 0.5;
    data.push({
      time: `2024-${String(Math.floor(i / 30) + 1).padStart(2, "0")}-${String((i % 30) + 1).padStart(2, "0")}`,
      open: base,
      high: base + 1,
      low: base - 0.5,
      close: base + 0.5,
      volume: 1_000_000 + i * 1000,
      value: null,
    });
  }
  return data;
}

function makeDowntrend(n: number): Bar[] {
  const data: Bar[] = [];
  for (let i = 0; i < n; i++) {
    const base = 200 - i * 0.5;
    data.push({
      time: `2024-${String(Math.floor(i / 30) + 1).padStart(2, "0")}-${String((i % 30) + 1).padStart(2, "0")}`,
      open: base,
      high: base + 0.5,
      low: base - 1,
      close: base - 0.5,
      volume: 1_000_000,
      value: null,
    });
  }
  return data;
}

function fakeSource(bars: Bar[]): any {
  return { fetchBars: async (p: any) => ({ [p.symbols[0]]: bars }) };
}

describe("classifyTrend", () => {
  it("detects bullish uptrend", () => {
    const r = classifyTrend(makeUptrend(220));
    expect(r.direction).toBe("bullish");
    expect(r.strength).toBeGreaterThan(0);
    expect(r.rationale).toContain("EMA");
  });

  it("detects bearish downtrend", () => {
    const r = classifyTrend(makeDowntrend(220));
    expect(r.direction).toBe("bearish");
  });

  it("returns neutral when data < 50 candles", () => {
    const r = classifyTrend(makeUptrend(30));
    expect(r.direction).toBe("neutral");
    expect(r.strength).toBe(0);
  });

  it("appends SuperTrend + Ichimoku confirmation to rationale on bullish uptrend", () => {
    const r = classifyTrend(makeUptrend(220));
    expect(r.direction).toBe("bullish");
    expect(r.rationale).toMatch(/ST.*Ichimoku|Ichimoku.*ST/i);
  });

  it("appends SuperTrend + Ichimoku confirmation to rationale on bearish downtrend", () => {
    const r = classifyTrend(makeDowntrend(220));
    expect(r.direction).toBe("bearish");
    expect(r.rationale).toMatch(/ST.*Ichimoku|Ichimoku.*ST/i);
  });
});

function makeTrendingBars(n: number, start: number, step = 0.002): Bar[] {
  const out: Bar[] = [];
  let p = start;
  for (let i = 0; i < n; i++) {
    out.push({ time: "2026-01-" + String(i).padStart(3, "0"), open: p, high: p * 1.005, low: p * 0.995, close: p * (1 + step), volume: 1000, value: null });
    p = p * (1 + step);
  }
  return out;
}

describe("classifyTrend strength is scale-free", () => {
  it("gives the same trend for the same shape at any price level", () => {
    const base = makeTrendingBars(120, 25);
    const scaled = base.map((b) => ({ ...b, open: b.open * 1000, high: b.high * 1000, low: b.low * 1000, close: b.close * 1000 }));
    const a = classifyTrend(base);
    const c = classifyTrend(scaled);
    expect(c.direction).toBe(a.direction);
    expect(c.strength).toBeCloseTo(a.strength, 6);
  });

  it("keeps strength for a 0.2%/session trend near its v1 value at price 25", () => {
    expect(classifyTrend(makeTrendingBars(120, 25)).strength).toBeGreaterThan(0.3);
    expect(classifyTrend(makeTrendingBars(120, 25)).strength).toBeLessThan(0.8);
  });
});

describe("snapshotIndicators", () => {
  it("returns last values for 220-candle uptrend", () => {
    const snap = snapshotIndicators(makeUptrend(220));
    expect(snap.rsi14).not.toBeNull();
    expect(snap.macd.line).not.toBeNull();
    expect(snap.sma[20]).not.toBeNull();
    expect(snap.sma[200]).not.toBeNull();
    expect(snap.bollinger.percentB).not.toBeNull();
    expect(snap.atr14).not.toBeNull();
    expect(snap.superTrend.value).not.toBeNull();
    expect(snap.superTrend.direction).not.toBeNull();
    expect(snap.ichimoku.tenkanSen).not.toBeNull();
    expect(snap.ichimoku.kijunSen).not.toBeNull();
    expect(snap.ichimoku.cloudTop).not.toBeNull();
    expect(snap.ichimoku.cloudBottom).not.toBeNull();
    expect(["above", "below", "inside", null]).toContain(snap.ichimoku.priceVsCloud);
    expect(["bullish", "bearish", "none"]).toContain(snap.ichimoku.tkCross);
  });

  it("gracefully handles short data (< 200)", () => {
    const snap = snapshotIndicators(makeUptrend(60));
    expect(snap.sma[200]).toBeNull();
    expect(snap.ema[200]).toBeNull();
    expect(snap.sma[20]).not.toBeNull();
    expect(snap.sma[50]).not.toBeNull();
  });
});

describe("classifyVolume", () => {
  it("returns normal for stable volume", () => {
    const data = makeUptrend(30).map((c) => ({ ...c, volume: 1_000_000 }));
    const v = classifyVolume(data);
    expect(v.signal).toBe("normal");
    expect(Math.abs(v.zscore)).toBeLessThan(1);
  });

  it("detects above_average spike (constant baseline fallback)", () => {
    const data = makeUptrend(30).map((c) => ({ ...c, volume: 1_000_000 }));
    data[data.length - 1].volume = 10_000_000;
    const v = classifyVolume(data);
    expect(v.signal).toBe("above_average");
    expect(v.zscore).toBeGreaterThan(1);
  });

  it("detects above_average spike (variable baseline)", () => {
    const data = makeUptrend(30).map((c, i) => ({ ...c, volume: 1_000_000 + (i % 5) * 50_000 }));
    data[data.length - 1].volume = 10_000_000;
    const v = classifyVolume(data);
    expect(v.signal).toBe("above_average");
    expect(v.zscore).toBeGreaterThan(2);
  });

  it("returns normal when < 21 candles", () => {
    const data = makeUptrend(10);
    const v = classifyVolume(data);
    expect(v.signal).toBe("normal");
    expect(v.zscore).toBe(0);
  });
});

describe("computePerformance", () => {
  it("computes change windows", () => {
    const data = makeUptrend(100);
    const p = computePerformance(data);
    expect(p.change1d).not.toBeNull();
    expect(p.change7d).not.toBeNull();
    expect(p.change30d).not.toBeNull();
    expect(p.change90d).not.toBeNull();
    expect(p.change1d as number).toBeGreaterThan(0);
  });

  it("reports change in percent, like changePct", async () => {
    const bar = (time: string, close: number): Bar => ({ time, open: close, high: close, low: close, close, volume: 0, value: null });
    const p = computePerformance([bar("2024-01-01", 50000), bar("2024-01-02", 55000)]);
    expect(p.change1d).toBe(10);
    const ctx = await buildContext(fakeSource(makeUptrend(220)), "VCB");
    const text = formatAIPrompt({ ...ctx, performance: p }, "en");
    expect(text).toContain("1d +10.00%");
  });

  it("returns null for short data", () => {
    const data = makeUptrend(20);
    const p = computePerformance(data);
    expect(p.change1d).not.toBeNull();
    expect(p.change30d).toBeNull();
    expect(p.change90d).toBeNull();
  });
});

describe("detectPivots", () => {
  it("finds swing highs and lows in synthetic data with peaks", () => {
    // create data with explicit peak at i=10 and trough at i=20
    const data: Bar[] = [];
    for (let i = 0; i < 30; i++) {
      const base = 100;
      let high = base + 1;
      let low = base - 1;
      if (i === 10) {
        high = 120;
        low = 119;
      }
      if (i === 20) {
        high = 81;
        low = 80;
      }
      data.push({
        time: `2024-01-${String(i + 1).padStart(2, "0")}`,
        open: base,
        high,
        low,
        close: base,
        volume: 0,
        value: null,
      });
    }
    const pivots = detectPivots(data, { window: 3, topN: 3 });
    expect(pivots.resistance.length + pivots.support.length).toBeGreaterThan(0);
  });

  it("returns empty when data too short", () => {
    const data = makeUptrend(5);
    const pivots = detectPivots(data);
    expect(pivots.support).toEqual([]);
    expect(pivots.resistance).toEqual([]);
  });
});

describe("buildContext (integration via a fake source)", () => {
  it("composes the full context from daily bars", async () => {
    const ctx = await buildContext(fakeSource(makeUptrend(220)), "VCB");
    expect(ctx.symbol).toBe("VCB");
    expect(ctx.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(ctx.trend.direction).toBe("bullish");
    expect(ctx.indicators.rsi14).not.toBeNull();
    expect(ctx.performance.change30d).not.toBeNull();
  });
});

describe("formatAIPrompt", () => {
  it("vi output contains expected labels", async () => {
    const ctx = await buildContext(fakeSource(makeUptrend(220)), "VCB");
    const text = formatAIPrompt(ctx, "vi");
    expect(text).toContain("Trend:");
    expect(text).toContain("RSI(14)");
    expect(text).toContain("MACD");
    expect(text).toContain("Support:");
    expect(text).toContain("Resistance:");
    expect(text).toContain("Change:");
    expect(text).toContain("SuperTrend:");
    expect(text).toContain("Ichimoku:");
    expect(text).toContain("TK cross:");
  });

  it("en output contains English labels", async () => {
    const ctx = await buildContext(fakeSource(makeUptrend(220)), "VCB");
    const text = formatAIPrompt(ctx, "en");
    expect(text).toContain("Trend:");
    expect(text).toContain("Bollinger %B:");
    expect(text).toContain("SuperTrend:");
    expect(text).toContain("Ichimoku:");
    expect(text).toContain("TK cross:");
  });
});
