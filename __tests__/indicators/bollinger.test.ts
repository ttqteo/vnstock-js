import { bollinger } from "../../src/indicators/bollinger";

function makeCandle(date: string, close: number) {
  return { date, open: close, high: close, low: close, close, volume: 0 };
}

describe("bollinger", () => {
  // Period 5, stddev 2, constant close → bands collapse to middle
  const constantData = [10, 10, 10, 10, 10].map((c, i) =>
    makeCandle(`2024-01-0${i + 1}`, c)
  );

  it("returns same length as input", () => {
    const result = bollinger(constantData, { period: 5 });
    expect(result).toHaveLength(5);
  });

  it("first period-1 entries are nulls", () => {
    const result = bollinger(constantData, { period: 5 });
    for (let i = 0; i < 4; i++) {
      expect(result[i].upper).toBeNull();
      expect(result[i].middle).toBeNull();
      expect(result[i].lower).toBeNull();
      expect(result[i].percentB).toBeNull();
    }
  });

  it("constant data: upper = middle = lower, stddev = 0", () => {
    const result = bollinger(constantData, { period: 5 });
    const last = result[4];
    expect(last.middle).toBeCloseTo(10);
    expect(last.upper).toBeCloseTo(10);
    expect(last.lower).toBeCloseTo(10);
  });

  it("known dataset: middle = mean, upper > middle > lower", () => {
    // closes [2, 4, 6, 8, 10] period 5
    // mean = 6, variance = ((2-6)^2 + (4-6)^2 + (6-6)^2 + (8-6)^2 + (10-6)^2) / 5
    //      = (16+4+0+4+16)/5 = 8, stddev = sqrt(8) ≈ 2.828
    const data = [2, 4, 6, 8, 10].map((c, i) =>
      makeCandle(`2024-01-0${i + 1}`, c)
    );
    const result = bollinger(data, { period: 5, stddev: 2 });
    const last = result[4];
    expect(last.middle).toBeCloseTo(6);
    expect(last.upper).toBeCloseTo(6 + 2 * Math.sqrt(8), 3);
    expect(last.lower).toBeCloseTo(6 - 2 * Math.sqrt(8), 3);
  });

  it("percentB: value at upper → 1, at lower → 0, at middle → 0.5", () => {
    const data = [2, 4, 6, 8, 10].map((c, i) =>
      makeCandle(`2024-01-0${i + 1}`, c)
    );
    const result = bollinger(data, { period: 5, stddev: 2 });
    // last close = 10, upper ≈ 6 + 5.66 = 11.66, lower ≈ 6 - 5.66 = 0.34
    // percentB = (10 - 0.34) / (11.66 - 0.34) ≈ 0.853
    expect(result[4].percentB as number).toBeGreaterThan(0.5);
    expect(result[4].percentB as number).toBeLessThan(1);
  });

  it("preserves dates", () => {
    const result = bollinger(constantData, { period: 5 });
    expect(result[4].date).toBe("2024-01-05");
  });

  it("returns empty array for empty input", () => {
    expect(bollinger([])).toEqual([]);
  });

  it("throws on period < 1", () => {
    expect(() => bollinger(constantData, { period: 0 })).toThrow();
  });
});
