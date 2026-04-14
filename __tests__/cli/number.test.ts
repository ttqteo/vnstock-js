import { compactNumber, formatPrice, formatPercent } from "../../src/cli/format/number";

describe("compactNumber", () => {
  it("formats millions", () => {
    expect(compactNumber(3_830_000)).toBe("3.83M");
    expect(compactNumber(1_000_000)).toBe("1.00M");
  });

  it("formats thousands", () => {
    expect(compactNumber(12_500)).toBe("12.5K");
    expect(compactNumber(1_000)).toBe("1.00K");
  });

  it("keeps small numbers", () => {
    expect(compactNumber(999)).toBe("999");
    expect(compactNumber(0)).toBe("0");
  });

  it("handles billions", () => {
    expect(compactNumber(1_234_000_000)).toBe("1.23B");
  });

  it("rolls over at unit boundaries", () => {
    expect(compactNumber(999_950)).toBe("1.00M");
    expect(compactNumber(999_995_000)).toBe("1.00B");
  });
});

describe("formatPrice", () => {
  it("formats VND price", () => {
    expect(formatPrice(59.3)).toBe("59.3k");
    expect(formatPrice(1234.56)).toBe("1234.56k");
  });

  it("rounds floating-point artifacts to 2 decimals", () => {
    expect(formatPrice(56.291760000000004)).toBe("56.29k");
    expect(formatPrice(60.43164)).toBe("60.43k");
  });

  it("trims trailing zeros", () => {
    expect(formatPrice(60.0)).toBe("60k");
    expect(formatPrice(59.3)).toBe("59.3k");
  });
});

describe("formatPercent", () => {
  it("formats percent with sign", () => {
    expect(formatPercent(1.7)).toBe("+1.70%");
    expect(formatPercent(-0.5)).toBe("-0.50%");
    expect(formatPercent(0)).toBe("+0.00%");
  });
});
