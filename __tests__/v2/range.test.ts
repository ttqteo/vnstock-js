import { resolveWindow, sourceInterval } from "../../src/client/range";
import { InvalidParameterError } from "../../src/errors";

const NOW = Date.parse("2026-10-14T03:00:00Z");

describe("resolveWindow", () => {
  it("turns a range into from/to dates in ICT", () => {
    expect(resolveWindow("6mo", NOW)).toEqual({ from: "2026-04-14", to: "2026-10-14" });
    expect(resolveWindow("ytd", NOW)).toEqual({ from: "2026-01-01", to: "2026-10-14" });
    expect(resolveWindow("5d", NOW)).toEqual({ from: "2026-10-07", to: "2026-10-14" });
    expect(resolveWindow("1d", NOW)).toEqual({ from: "2026-10-10", to: "2026-10-14" });
    expect(resolveWindow("1y", NOW)).toEqual({ from: "2025-10-14", to: "2026-10-14" });
    expect(resolveWindow("max", NOW)).toEqual({ from: "2000-01-01", to: "2026-10-14" });
  });

  it("uses the ICT date, not the UTC date", () => {
    expect(resolveWindow("ytd", Date.parse("2026-12-31T18:00:00Z"))).toEqual({ from: "2027-01-01", to: "2027-01-01" });
  });

  it("clamps month arithmetic to the end of the month", () => {
    expect(resolveWindow("1mo", Date.parse("2026-03-31T03:00:00Z"))).toEqual({ from: "2026-02-28", to: "2026-03-31" });
    expect(resolveWindow("6mo", Date.parse("2026-08-31T03:00:00Z"))).toEqual({ from: "2026-02-28", to: "2026-08-31" });
  });

  it("accepts explicit from/to", () => {
    expect(resolveWindow({ from: "2025-01-01", to: "2025-12-31" }, NOW)).toEqual({ from: "2025-01-01", to: "2025-12-31" });
    expect(resolveWindow({ from: "2025-01-01" }, NOW)).toEqual({ from: "2025-01-01", to: "2026-10-14" });
  });

  it("rejects v1-style ranges with a hint", () => {
    try {
      resolveWindow("6m" as any, NOW);
      throw new Error("expected throw");
    } catch (e: any) {
      expect(e).toBeInstanceOf(InvalidParameterError);
      expect(e.hint).toBe('Use "6mo" for six months; "m" is not a unit here.');
    }
  });

  it("points other day ranges at { from }", () => {
    try {
      resolveWindow("10d" as any, NOW);
      throw new Error("expected throw");
    } catch (e: any) {
      expect(e).toBeInstanceOf(InvalidParameterError);
      expect(e.hint).toBe('Supported day ranges are "1d" and "5d"; pass { from } for others.');
    }
  });

  it("rejects malformed dates and from after to", () => {
    expect(() => resolveWindow({ from: "2026-02-01", to: "2026-01-01" }, NOW)).toThrow(InvalidParameterError);
    expect(() => resolveWindow({ from: "01/02/2026" }, NOW)).toThrow(InvalidParameterError);
  });
});

describe("sourceInterval", () => {
  it("maps each interval to the source frame it is built from", () => {
    expect(sourceInterval("1m")).toBe("ONE_MINUTE");
    expect(sourceInterval("15m")).toBe("ONE_MINUTE");
    expect(sourceInterval("1h")).toBe("ONE_HOUR");
    expect(sourceInterval("1d")).toBe("ONE_DAY");
    expect(sourceInterval("1w")).toBe("ONE_DAY");
    expect(sourceInterval("1mo")).toBe("ONE_DAY");
  });

  it("rejects unknown intervals", () => {
    expect(() => sourceInterval("2h" as any)).toThrow(InvalidParameterError);
  });
});
