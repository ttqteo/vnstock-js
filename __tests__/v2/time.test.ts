import { ictDate, ictDateTime, isIndexSymbol } from "../../src/shared/time";

describe("time helpers", () => {
  it("formats a daily bar stamped 00:00 UTC as that calendar day", () => {
    expect(ictDate(Date.parse("2026-10-14T00:00:00Z") / 1000)).toBe("2026-10-14");
  });
  it("formats intraday bars with time and +07:00 offset", () => {
    expect(ictDateTime(Date.parse("2026-10-14T02:15:00Z") / 1000)).toBe("2026-10-14T09:15:00+07:00");
  });
  it("does not depend on the machine timezone", () => {
    const ts = Date.parse("2026-10-14T18:30:00Z") / 1000;
    expect(ictDate(ts)).toBe("2026-10-15");
  });
  it("knows index symbols case-insensitively", () => {
    expect(isIndexSymbol("vnindex")).toBe(true);
    expect(isIndexSymbol("HNXIndex")).toBe(true);
    expect(isIndexSymbol("FPT")).toBe(false);
  });
});
