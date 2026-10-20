import { VciAdapter } from "../../src/adapters/vci";
import { CHART_URL } from "../../src/shared/constants";
import { RequestConfig, Transport } from "../../src/transport";

// Restates every scenario of the v1 vci-quote-history test for fetchBars and fetchQuotes,
// with `time` and prices in dong, through an injected transport.

function unix(date: string, zone: string = ""): number {
  return new Date(date + "T00:00:00" + zone).getTime() / 1000;
}

// VCI's chart endpoint returns `countBack` bars ending at `to`, whatever `from` says.
function chartOf(dates: string[], zone: string = "Z", symbol = "FPT") {
  return {
    symbol,
    t: dates.map((d) => unix(d, zone)),
    o: dates.map(() => 100000),
    h: dates.map(() => 101000),
    l: dates.map(() => 99000),
    c: dates.map(() => 100500),
    v: dates.map(() => 1),
    accumulatedValue: dates.map(() => 2),
  };
}

function fakeTransport(answer: (c: RequestConfig) => unknown) {
  const calls: RequestConfig[] = [];
  const transport: Transport = {
    async request<T>(c: RequestConfig): Promise<T> {
      calls.push(c);
      return answer(c) as T;
    },
  };
  return { calls, transport };
}

function chartTransport(dates: string[]) {
  return fakeTransport((c) => (c.url === CHART_URL ? [chartOf(dates)] : {}));
}

function chartRequest(calls: RequestConfig[]): any {
  const call = calls.find((c) => c.url === CHART_URL);
  return call && call.data;
}

describe("VciAdapter.fetchBars()", () => {
  it("drops bars before from when countBack is not given", async () => {
    const { transport } = chartTransport(["2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"]);
    const out = await new VciAdapter({ transport }).fetchBars({ symbols: ["FPT"], from: "2026-10-01", to: "2026-10-03", frame: "ONE_DAY" });
    expect(out.FPT.map((b) => b.time)).toEqual(["2026-10-01", "2026-10-02"]);
  });

  it("returns prices in dong and turnover in dong", async () => {
    const { transport } = chartTransport(["2026-10-01"]);
    const out = await new VciAdapter({ transport }).fetchBars({ symbols: ["FPT"], from: "2026-10-01", to: "2026-10-01", frame: "ONE_DAY" });
    expect(out.FPT).toEqual([{ time: "2026-10-01", open: 100000, high: 101000, low: 99000, close: 100500, volume: 1, value: 2000000 }]);
  });

  it("asks for enough bars to reach a from older than a year", async () => {
    const { transport, calls } = chartTransport(["2020-01-02"]);
    await new VciAdapter({ transport }).fetchBars({ symbols: ["FPT"], from: "2020-01-01", to: "2026-10-01", frame: "ONE_DAY" });
    // 2020-01-01 to 2026-10-01 holds about 1,700 sessions; a fixed 365 would cut it short.
    expect(chartRequest(calls).countBack).toBeGreaterThan(1700);
    expect(chartRequest(calls).timeFrame).toBe("ONE_DAY");
  });

  it("includes the to session whatever the machine's time zone", async () => {
    // Daily bars are stamped 00:00 UTC and `to` is inclusive, so both bounds are read in UTC.
    const days = ["2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"];
    const original = process.env.TZ;
    try {
      for (const zone of ["Asia/Ho_Chi_Minh", "America/New_York", "UTC"]) {
        process.env.TZ = zone;
        const { transport } = fakeTransport((c: any) => {
          if (c.url !== CHART_URL) return {};
          const kept = days.filter((d) => Date.parse(d + "T00:00:00Z") / 1000 <= c.data.to);
          return [chartOf(kept.slice(-c.data.countBack), "Z")];
        });
        const out = await new VciAdapter({ transport }).fetchBars({ symbols: ["FPT"], from: "2026-09-30", to: "2026-10-01", frame: "ONE_DAY" });
        expect([zone, out.FPT.map((b) => b.time)]).toEqual([zone, ["2026-09-30", "2026-10-01"]]);
      }
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
  });

  it("keeps bars before from when the caller sets countBack", async () => {
    const { transport, calls } = chartTransport(["2026-09-29", "2026-09-30", "2026-10-01"]);
    const out = await new VciAdapter({ transport }).fetchBars({ symbols: ["FPT"], from: "2026-10-01", to: "2026-10-03", frame: "ONE_DAY", countBack: 10 });
    expect(chartRequest(calls).countBack).toBe(10);
    expect(out.FPT).toHaveLength(3);
  });

  it("keys bars by symbol and gives every requested symbol an entry", async () => {
    const { transport } = fakeTransport(() => [chartOf(["2026-10-01"], "Z", "FPT"), chartOf(["2026-10-01"], "Z", "VNINDEX")]);
    const out = await new VciAdapter({ transport }).fetchBars({ symbols: ["FPT", "VNINDEX", "XYZ"], from: "2026-10-01", to: "2026-10-01", frame: "ONE_DAY" });
    expect(Object.keys(out).sort()).toEqual(["FPT", "VNINDEX", "XYZ"]);
    expect(out.XYZ).toEqual([]);
  });

  it("asks VCI for HNXIndex and HNXUpcomIndex in its casing and keys them as the caller wrote them", async () => {
    // The chart endpoint matches these two codes case-sensitively and answers with its own casing.
    const { transport, calls } = fakeTransport((c: any) =>
      c.data.symbols.filter((s: string) => s === "HNXIndex" || s === "HNXUpcomIndex").map((s: string) => chartOf(["2026-10-01"], "Z", s))
    );
    const out = await new VciAdapter({ transport }).fetchBars({
      symbols: ["HNXINDEX", "HNXUpcomIndex"],
      from: "2026-10-01",
      to: "2026-10-01",
      frame: "ONE_DAY",
    });
    expect(chartRequest(calls).symbols).toEqual(["HNXIndex", "HNXUpcomIndex"]);
    expect(Object.keys(out).sort()).toEqual(["HNXINDEX", "HNXUpcomIndex"]);
    expect(out.HNXINDEX).toHaveLength(1);
    expect(out.HNXUpcomIndex).toHaveLength(1);
  });

  it("sizes intraday windows per frame and stamps ICT time", async () => {
    const { transport, calls } = fakeTransport(() => [
      { symbol: "FPT", t: [Date.parse("2026-10-01T02:15:00Z") / 1000], o: [1], h: [1], l: [1], c: [1], v: [1] },
    ]);
    const out = await new VciAdapter({ transport }).fetchBars({ symbols: ["FPT"], from: "2026-10-01", to: "2026-10-01", frame: "ONE_MINUTE" });
    expect(chartRequest(calls).timeFrame).toBe("ONE_MINUTE");
    expect(chartRequest(calls).countBack).toBeGreaterThanOrEqual(255);
    expect(out.FPT[0].time).toBe("2026-10-01T09:15:00+07:00");
  });
});

describe("VciAdapter.fetchQuotes()", () => {
  function boardTransport(refPrice: number, matchPrice: number, board = "HSX") {
    return fakeTransport(() => [{ listingInfo: { symbol: "VNM", refPrice, ceiling: 62000, floor: 54000, board }, matchPrice: { matchPrice }, bidAsk: {} }]);
  }

  it("reports the change against the reference price, in dong", async () => {
    const { transport, calls } = boardTransport(58000, 57500);
    const [q] = await new VciAdapter({ transport }).fetchQuotes(["VNM"]);
    expect(q.change).toBe(-500);
    expect(q.changePct).toBe(-0.862);
    expect(q.exchange).toBe("HOSE");
    expect(calls[0].data).toEqual({ symbols: ["VNM"] });
  });

  it("reports no change before the first match of the session", async () => {
    const { transport } = boardTransport(58000, 0);
    const [q] = await new VciAdapter({ transport }).fetchQuotes(["VNM"]);
    expect(q.change).toBe(0);
    expect(q.changePct).toBe(0);
  });
});

describe("VciAdapter with a transport", () => {
  it("sends every request through the transport", async () => {
    const { transport, calls } = fakeTransport(() => [{ symbol: "VCB", board: "HSX", organName: "Vietcombank" }]);
    const rows = await new VciAdapter({ transport }).fetchSymbolsByGroup("VN30");
    expect(calls).toHaveLength(1);
    expect(rows[0].symbol).toBe("VCB");
  });
});
