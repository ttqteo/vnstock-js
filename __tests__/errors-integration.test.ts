import { validateDateFormat, inputValidation, asOfToExclusiveEnd } from "../src/shared/utils";
import { InvalidParameterError } from "../src/errors";

describe("asOfToExclusiveEnd", () => {
  // The chart endpoint's `end` is exclusive: end=2026-07-21 yields bars through
  // 2026-07-20. asOf means "include this session", so it must shift a day.
  it("shifts one day forward so the asOf session is included", () => {
    expect(asOfToExclusiveEnd("2026-07-20")).toBe("2026-07-21");
  });

  it("rolls over month boundaries", () => {
    expect(asOfToExclusiveEnd("2026-07-31")).toBe("2026-08-01");
  });

  it("rolls over year boundaries", () => {
    expect(asOfToExclusiveEnd("2026-12-31")).toBe("2027-01-01");
  });

  it("handles leap days", () => {
    expect(asOfToExclusiveEnd("2028-02-28")).toBe("2028-02-29");
  });

  it("rejects a malformed date rather than producing a silent Invalid Date", () => {
    expect(() => asOfToExclusiveEnd("20/07/2026")).toThrow(InvalidParameterError);
  });
});

describe("validateDateFormat", () => {
  it("throws InvalidParameterError for invalid date format", () => {
    expect(() => validateDateFormat(["2024-1-1"])).toThrow(InvalidParameterError);
  });

  it("throws InvalidParameterError for non-date string", () => {
    expect(() => validateDateFormat(["not-a-date"])).toThrow(InvalidParameterError);
  });

  it("passes for valid YYYY-MM-DD dates", () => {
    expect(validateDateFormat(["2024-01-01", "2024-12-31"])).toBe(true);
  });
});

describe("inputValidation", () => {
  it("throws InvalidParameterError for invalid timeFrame", () => {
    expect(() => inputValidation("3D")).toThrow(InvalidParameterError);
  });

  it("does not throw for valid timeFrame", () => {
    expect(() => inputValidation("1D")).not.toThrow();
  });

  it("does not throw when timeFrame is undefined", () => {
    expect(() => inputValidation(undefined)).not.toThrow();
  });
});
