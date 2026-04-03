import { validateDateFormat, inputValidation } from "../src/shared/utils";
import { InvalidParameterError } from "../src/errors";

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
