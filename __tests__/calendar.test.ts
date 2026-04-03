import { Calendar } from "../src/core/market/calendar";

const cal = new Calendar();

describe("Calendar", () => {
  describe("isTradeDay", () => {
    it("returns false for Saturday", () => {
      expect(cal.isTradeDay("2026-04-04")).toBe(false);
    });

    it("returns false for Sunday", () => {
      expect(cal.isTradeDay("2026-04-05")).toBe(false);
    });

    it("returns true for a normal Friday", () => {
      expect(cal.isTradeDay("2026-04-03")).toBe(true);
    });

    it("returns false for Tet holiday", () => {
      expect(cal.isTradeDay("2026-02-17")).toBe(false);
    });

    it("returns false for New Year", () => {
      expect(cal.isTradeDay("2026-01-01")).toBe(false);
    });
  });

  describe("nextTradeDay", () => {
    it("returns Monday for Friday input", () => {
      expect(cal.nextTradeDay("2026-04-03")).toBe("2026-04-06");
    });

    it("returns Monday for Saturday input", () => {
      expect(cal.nextTradeDay("2026-04-04")).toBe("2026-04-06");
    });

    it("skips holidays and weekends", () => {
      expect(cal.nextTradeDay("2026-04-29")).toBe("2026-05-04");
    });
  });

  describe("prevTradeDay", () => {
    it("returns Friday for Monday input", () => {
      expect(cal.prevTradeDay("2026-04-06")).toBe("2026-04-03");
    });

    it("returns Friday for Sunday input", () => {
      expect(cal.prevTradeDay("2026-04-05")).toBe("2026-04-03");
    });
  });

  describe("holidays", () => {
    it("returns holidays for 2026 with more than 5 entries", () => {
      var h = cal.holidays(2026);
      expect(h.length).toBeGreaterThan(5);
      expect(h).toContain("2026-01-01");
    });

    it("returns empty array for unknown year", () => {
      expect(cal.holidays(2099)).toEqual([]);
    });
  });

  describe("session", () => {
    it("returns HOSE session times", () => {
      var s = cal.session();
      expect(s.exchange).toBe("HOSE");
      expect(s.morning.open).toBe("09:00");
      expect(s.morning.close).toBe("11:30");
      expect(s.afternoon.open).toBe("13:00");
      expect(s.afternoon.close).toBe("14:45");
      expect(s.ato).toBe("09:00");
      expect(s.atc).toBe("14:30");
    });
  });
});
