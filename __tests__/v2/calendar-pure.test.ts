import { isTradeDay, nextTradeDay, prevTradeDay, holidays } from "../../src/core/market/calendar";

const HOLIDAYS = { "2026": ["2026-09-02", "2026-04-30", "2026-05-01"], "2027": ["2027-01-01"] };

describe("pure calendar functions", () => {
  it("rejects weekends and holidays", () => {
    expect(isTradeDay(HOLIDAYS, "2026-10-14")).toBe(true);
    expect(isTradeDay(HOLIDAYS, "2026-10-17")).toBe(false);
    expect(isTradeDay(HOLIDAYS, "2026-10-18")).toBe(false);
    expect(isTradeDay(HOLIDAYS, "2026-09-02")).toBe(false);
  });

  it("steps over weekends and holidays", () => {
    expect(nextTradeDay(HOLIDAYS, "2026-04-29")).toBe("2026-05-04");
    expect(prevTradeDay(HOLIDAYS, "2026-05-04")).toBe("2026-04-29");
    expect(nextTradeDay(HOLIDAYS, "2026-12-31")).toBe("2027-01-04");
  });

  it("lists holidays per year", () => {
    expect(holidays(HOLIDAYS, 2027)).toEqual(["2027-01-01"]);
    expect(holidays(HOLIDAYS, 2030)).toEqual([]);
  });

  it("works with an empty holiday table", () => {
    expect(isTradeDay({}, "2026-09-02")).toBe(true);
  });
});

// Restated from the v1 Calendar tests on the shipped dataset.
describe("calendar functions on data/holidays.json", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const table: Record<string, string[]> = require("../../data/holidays.json");

  it("rejects weekends, Tet and New Year and accepts a normal Friday", () => {
    expect(isTradeDay(table, "2026-04-04")).toBe(false);
    expect(isTradeDay(table, "2026-04-05")).toBe(false);
    expect(isTradeDay(table, "2026-04-03")).toBe(true);
    expect(isTradeDay(table, "2026-02-17")).toBe(false);
    expect(isTradeDay(table, "2026-01-01")).toBe(false);
  });

  it("steps from Friday and Saturday to Monday and over the 30/4 holidays", () => {
    expect(nextTradeDay(table, "2026-04-03")).toBe("2026-04-06");
    expect(nextTradeDay(table, "2026-04-04")).toBe("2026-04-06");
    expect(nextTradeDay(table, "2026-04-29")).toBe("2026-05-04");
    expect(prevTradeDay(table, "2026-04-06")).toBe("2026-04-03");
    expect(prevTradeDay(table, "2026-04-05")).toBe("2026-04-03");
  });

  it("lists the 2026 holidays and nothing for an unknown year", () => {
    expect(holidays(table, 2026).length).toBeGreaterThan(5);
    expect(holidays(table, 2026)).toContain("2026-01-01");
    expect(holidays(table, 2099)).toEqual([]);
  });
});
