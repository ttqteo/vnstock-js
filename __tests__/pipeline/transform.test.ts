import { applyTransform } from "../../src/pipeline/transform";
import { TransformConfig } from "../../src/pipeline/types";

describe("applyTransform", () => {
  const config: TransformConfig = {
    fieldMap: { o: "open", h: "high", l: "low", c: "close", v: "volume", t: "date" },
    dateFields: ["date"],
    percentFields: [],
  };

  it("renames fields according to fieldMap", () => {
    const raw = { o: 25500, h: 26000, l: 25000, c: 25800, v: 1000000, t: 1705276800 };
    const result = applyTransform(raw, config);
    expect(result).toHaveProperty("open");
    expect(result).toHaveProperty("high");
    expect(result).not.toHaveProperty("o");
  });

  it("keeps prices in dong as the source sends them", () => {
    const raw = { o: 25500, h: 26000, l: 25000, c: 25800, v: 1000000, t: 1705276800 };
    const result = applyTransform(raw, config);
    expect(result.open).toBe(25500);
    expect(result.close).toBe(25800);
  });

  it("converts timestamp to ISO date string", () => {
    const raw = { o: 25500, h: 26000, l: 25000, c: 25800, v: 1000000, t: 1705276800 };
    const result = applyTransform(raw, config);
    expect(result.date).toBe("2024-01-15");
  });

  it("reads timestamps as ICT dates, accepts milliseconds and keeps ISO strings", () => {
    expect(applyTransform({ t: Date.parse("2024-01-14T20:00:00Z") / 1000 }, config).date).toBe("2024-01-15");
    expect(applyTransform({ t: Date.parse("2024-01-14T20:00:00Z") }, config).date).toBe("2024-01-15");
    expect(applyTransform({ t: "2024-01-15T10:00:00" }, config).date).toBe("2024-01-15");
  });

  it("keeps non-price non-date fields as-is", () => {
    const raw = { o: 25500, h: 26000, l: 25000, c: 25800, v: 1000000, t: 1705276800 };
    const result = applyTransform(raw, config);
    expect(result.volume).toBe(1000000);
  });

  it("converts percent fields to decimal", () => {
    const pctConfig: TransformConfig = {
      fieldMap: { percentPriceChange: "priceChangePercent" },
      dateFields: [],
      percentFields: ["priceChangePercent"],
    };
    const raw = { percentPriceChange: 5.23 };
    const result = applyTransform(raw, pctConfig);
    expect(result.priceChangePercent).toBeCloseTo(0.0523);
  });

  it("handles null and undefined values by removing them", () => {
    const raw = { o: 25500, h: null, l: undefined, c: 25800, v: 1000000, t: 1705276800 };
    const result = applyTransform(raw, config);
    expect(result).not.toHaveProperty("high");
    expect(result).not.toHaveProperty("low");
  });

  it("passes through fields not in fieldMap when keepExtra is true", () => {
    const raw = { o: 25500, extra: "hello", t: 1705276800 };
    const result = applyTransform(raw, { ...config, keepExtra: true });
    expect(result.extra).toBe("hello");
  });

  it("drops fields not in fieldMap when keepExtra is false/default", () => {
    const raw = { o: 25500, extra: "hello", t: 1705276800 };
    const result = applyTransform(raw, config);
    expect(result).not.toHaveProperty("extra");
  });
});
