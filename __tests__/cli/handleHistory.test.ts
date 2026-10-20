import { handleHistory } from "../../src/cli/commands/history";

function isoDaysAgo(daysAgo: number): string {
  const d = new Date(Date.now() + 7 * 3600 * 1000);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().substring(0, 10);
}

const recentToday = isoDaysAgo(0);
const recentYesterday = isoDaysAgo(1);

const sampleBars = [
  { time: recentYesterday, open: 59000, high: 59300, low: 58900, close: 59200, volume: 4_100_000, value: null },
  { time: recentToday, open: 59200, high: 59400, low: 59100, close: 59300, volume: 3_830_000, value: null },
];

const base = { json: false, csv: false, color: false, quiet: true, verbose: false };

function fakeClient(bars: any[] = sampleBars) {
  const history = jest.fn(async (_input: any) => bars);
  const stock = jest.fn((_symbol: string) => ({ history }));
  return { client: { stock } as any, stock, history };
}

describe("handleHistory", () => {
  it("returns JSON rows, newest first", async () => {
    const { client } = fakeClient();
    const parsed = JSON.parse(await handleHistory(client, { symbol: "VCB", range: "7d", ...base, json: true }));
    expect(parsed).toHaveLength(2);
    expect(parsed[0].time).toBe(recentToday);
  });

  it("returns CSV with a time header", async () => {
    const { client } = fakeClient();
    const out = await handleHistory(client, { symbol: "VCB", range: "7d", ...base, csv: true });
    expect(out.split("\n")[0]).toContain("time");
    expect(out).toContain(recentToday);
  });

  it("prints prices from dong in the default table", async () => {
    const { client } = fakeClient();
    const out = await handleHistory(client, { symbol: "VCB", range: "7d", ...base });
    expect(out).toContain(recentToday);
    expect(out).toContain("59.3k");
  });

  it("prints index levels in points", async () => {
    const { client } = fakeClient([{ ...sampleBars[1], close: 1717.25 }]);
    const out = await handleHistory(client, { symbol: "VNINDEX", range: "7d", ...base });
    expect(out).toContain("1717.25");
    expect(out).not.toContain("1.72k");
  });

  it("reads 15 days before --range so the oldest row has a change", async () => {
    const { client, stock, history } = fakeClient();
    await handleHistory(client, { symbol: "vcb", range: "7d", ...base, json: true });
    expect(stock).toHaveBeenCalledWith("VCB");
    const call = history.mock.calls[0][0];
    expect(call.to).toBe(recentToday);
    expect(call.from).toBe(isoDaysAgo(22));
  });

  it("lets an explicit --from override --range", async () => {
    const { client, history } = fakeClient();
    await handleHistory(client, { symbol: "VCB", from: "2025-01-16", range: "7d", ...base, json: true });
    expect(history.mock.calls[0][0].from).toBe("2025-01-01");
  });

  it("applies --limit to rows", async () => {
    const bars = Array.from({ length: 10 }, (_, i) => ({ time: isoDaysAgo(9 - i), open: 1, high: 1, low: 1, close: 1, volume: 1, value: null }));
    const { client } = fakeClient(bars);
    expect(JSON.parse(await handleHistory(client, { symbol: "VCB", range: "30d", limit: 3, ...base, json: true }))).toHaveLength(3);
  });

  it("throws on an invalid date", async () => {
    const { client } = fakeClient();
    await expect(handleHistory(client, { symbol: "VCB", from: "bad-date", ...base, json: true })).rejects.toThrow();
  });
});
