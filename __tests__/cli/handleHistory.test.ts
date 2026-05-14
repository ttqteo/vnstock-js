jest.mock("../../src", () => ({
  __esModule: true,
  default: {
    stock: {
      quote: { history: jest.fn() },
    },
  },
}));

import { handleHistory, meta } from "../../src/cli/commands/history";
import sdk from "../../src";

const mockHistory = (sdk as any).stock.quote.history as jest.Mock;

function isoDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().substring(0, 10);
}

const recentToday = isoDaysAgo(0);
const recentYesterday = isoDaysAgo(1);

const sampleRows = [
  { date: recentToday, open: 59.2, high: 59.4, low: 59.1, close: 59.3, volume: 3_830_000 },
  { date: recentYesterday, open: 59.0, high: 59.3, low: 58.9, close: 59.2, volume: 4_100_000 },
];

const base = { json: false, csv: false, color: false, quiet: true, verbose: false };

beforeEach(() => {
  mockHistory.mockReset();
  mockHistory.mockResolvedValue(sampleRows);
});

describe("handleHistory meta", () => {
  it("does not require data init", () => {
    expect(meta.requiresData).toBe(false);
  });
});

describe("handleHistory", () => {
  it("returns JSON array when --json", async () => {
    const out = await handleHistory({ symbol: "VCB", range: "7d", ...base, json: true });
    const parsed = JSON.parse(out);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].date).toBe(recentToday);
  });

  it("returns CSV with date header", async () => {
    const out = await handleHistory({ symbol: "VCB", range: "7d", ...base, csv: true });
    expect(out.split("\n")[0]).toContain("date");
    expect(out).toContain(recentToday);
  });

  it("default table contains dates and prices", async () => {
    const out = await handleHistory({ symbol: "VCB", range: "7d", ...base });
    expect(out).toContain(recentToday);
    expect(out).toContain("59.3");
  });

  it("uses --range to compute start date", async () => {
    await handleHistory({ symbol: "VCB", range: "7d", ...base, json: true });
    const call = mockHistory.mock.calls[0][0];
    expect(call.symbols).toEqual(["VCB"]);
    expect(call.timeFrame).toBe("1D");
    expect(call.start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("explicit --from overrides --range", async () => {
    await handleHistory({ symbol: "VCB", from: "2025-01-01", ...base, json: true });
    const call = mockHistory.mock.calls[0][0];
    expect(call.start).toBe("2025-01-01");
  });

  it("applies --limit to rows", async () => {
    mockHistory.mockResolvedValue(
      Array.from({ length: 10 }, (_, i) => ({
        date: isoDaysAgo(9 - i),
        open: 1, high: 1, low: 1, close: 1, volume: 1,
      }))
    );
    const out = await handleHistory({ symbol: "VCB", range: "30d", limit: 3, ...base, json: true });
    const parsed = JSON.parse(out);
    expect(parsed).toHaveLength(3);
  });

  it("throws on invalid date format", async () => {
    await expect(
      handleHistory({ symbol: "VCB", from: "bad-date", ...base, json: true })
    ).rejects.toThrow();
  });
});
