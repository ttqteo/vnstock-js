import { swingPivots } from "../../src/indicators/pivots";
import { series, resetClock } from "./helpers";

beforeEach(resetClock);

describe("swingPivots", () => {
  it("finds strict swing highs and lows within the window", () => {
    const bars = series([1, 2, 3, 2, 1, 2, 3, 4, 3, 2]);
    const p = swingPivots(bars, 2);
    expect(p.map((x) => [x.kind, x.index])).toEqual([
      ["high", 2],
      ["low", 4],
      ["high", 7],
    ]);
    expect(p[0]).toMatchObject({ price: 3.3, time: bars[2].time });
  });

  it("returns nothing when the series is shorter than a full window", () => {
    expect(swingPivots(series([1, 2, 1]), 2)).toEqual([]);
  });
});
