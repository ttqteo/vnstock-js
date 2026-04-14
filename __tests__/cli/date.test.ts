import { parseDateInput, formatDate, todayISO, nowVN } from "../../src/cli/format/date";

describe("parseDateInput", () => {
  const today = new Date("2026-04-14T00:00:00Z");

  it("parses absolute ISO date", () => {
    expect(parseDateInput("2025-01-15", today)).toBe("2025-01-15");
  });

  it("parses relative days", () => {
    expect(parseDateInput("7d", today)).toBe("2026-04-07");
  });

  it("parses relative weeks", () => {
    expect(parseDateInput("1w", today)).toBe("2026-04-07");
    expect(parseDateInput("2w", today)).toBe("2026-03-31");
  });

  it("parses relative months", () => {
    expect(parseDateInput("1m", today)).toBe("2026-03-14");
  });

  it("parses relative years", () => {
    expect(parseDateInput("1y", today)).toBe("2025-04-14");
  });

  it("throws on invalid format", () => {
    expect(() => parseDateInput("abc", today)).toThrow();
    expect(() => parseDateInput("7x", today)).toThrow();
    expect(() => parseDateInput("2026/04/14", today)).toThrow();
  });

  it("accepts 'today'", () => {
    expect(parseDateInput("today", today)).toBe("2026-04-14");
  });

  it("snaps day to last day of target month (month rollover)", () => {
    const mar31 = new Date("2026-03-31T00:00:00Z");
    expect(parseDateInput("1m", mar31)).toBe("2026-02-28");
  });

  it("handles leap year Feb 29 across years", () => {
    const feb29 = new Date("2024-02-29T00:00:00Z");
    expect(parseDateInput("1y", feb29)).toBe("2023-02-28");
  });

  it("handles month subtraction into leap Feb", () => {
    const mar31_2024 = new Date("2024-03-31T00:00:00Z");
    expect(parseDateInput("1m", mar31_2024)).toBe("2024-02-29");
  });
});

describe("formatDate", () => {
  it("formats Date to YYYY-MM-DD", () => {
    expect(formatDate(new Date("2026-04-14T00:00:00Z"))).toBe("2026-04-14");
  });
});

describe("todayISO", () => {
  it("returns today YYYY-MM-DD", () => {
    const result = todayISO();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("nowVN (Vietnam timezone)", () => {
  it("is 7 hours ahead of UTC wall-clock representation", () => {
    // nowVN returns a Date whose UTC getters give the VN wall clock.
    // Check: nowVN().getTime() - Date.now() == +7h
    const before = Date.now();
    const vn = nowVN();
    const after = Date.now();
    const diff = vn.getTime() - before;
    expect(diff).toBeGreaterThanOrEqual(7 * 60 * 60 * 1000);
    expect(diff).toBeLessThanOrEqual(7 * 60 * 60 * 1000 + (after - before) + 10);
  });

  it("todayISO returns VN date regardless of process TZ", () => {
    // At UTC midnight, VN has already ticked over to 07:00 of same date.
    // This test pins that todayISO reflects VN wall clock, not local/UTC.
    const orig = Date.now;
    // Simulate process clock at 2026-04-13 23:00:00 UTC. VN is 2026-04-14 06:00.
    (Date as any).now = () => Date.UTC(2026, 3, 13, 23, 0, 0);
    try {
      expect(todayISO()).toBe("2026-04-14");
    } finally {
      Date.now = orig;
    }
  });
});
