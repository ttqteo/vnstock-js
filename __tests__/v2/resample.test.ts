import { resample } from "../../src/compute/resample";
import { Bar } from "../../src/types";

const b = (time: string, o: number, h: number, l: number, c: number, v: number, val: number | null = v * 10): Bar => ({
  time,
  open: o,
  high: h,
  low: l,
  close: c,
  volume: v,
  value: val,
});

describe("resample", () => {
  const days = [
    b("2026-10-05", 10, 12, 9, 11, 100), // Mon
    b("2026-10-06", 11, 13, 10, 12, 200),
    b("2026-10-09", 12, 15, 11, 14, 300), // Fri
    b("2026-10-12", 14, 14, 8, 9, 400), // next Mon
  ];

  it("builds ISO weeks stamped with the first session", () => {
    expect(resample(days, "1w")).toEqual([b("2026-10-05", 10, 15, 9, 14, 600, 6000), b("2026-10-12", 14, 14, 8, 9, 400, 4000)]);
  });

  it("keeps an ISO week that spans the new year together", () => {
    const w = resample([b("2026-12-31", 1, 2, 1, 2, 1), b("2027-01-01", 2, 3, 2, 3, 1), b("2027-01-04", 3, 3, 3, 3, 1)], "1w");
    expect(w.map((x) => [x.time, x.close, x.volume])).toEqual([
      ["2026-12-31", 3, 2],
      ["2027-01-04", 3, 1],
    ]);
  });

  it("builds calendar months", () => {
    const m = resample([b("2026-09-30", 5, 6, 4, 5, 1), ...days], "1mo");
    expect(m.map((x) => x.time)).toEqual(["2026-09-30", "2026-10-05"]);
    expect(m[1].close).toBe(9);
    expect(m[1].volume).toBe(1000);
  });

  it("buckets minutes into 15m slots by wall-clock time", () => {
    const mins = [b("2026-10-14T09:15:00+07:00", 1, 2, 1, 2, 1), b("2026-10-14T09:29:00+07:00", 2, 3, 2, 3, 1), b("2026-10-14T09:30:00+07:00", 3, 3, 1, 1, 1)];
    expect(resample(mins, "15m").map((x) => [x.time, x.open, x.close, x.volume])).toEqual([
      ["2026-10-14T09:15:00+07:00", 1, 3, 2],
      ["2026-10-14T09:30:00+07:00", 3, 1, 1],
    ]);
  });

  it("puts the 09:15 open into the 09:00 slot for 30m", () => {
    const mins = [b("2026-10-14T09:15:00+07:00", 1, 2, 1, 2, 1), b("2026-10-14T09:31:00+07:00", 2, 2, 2, 2, 1)];
    expect(resample(mins, "30m").map((x) => x.time)).toEqual(["2026-10-14T09:00:00+07:00", "2026-10-14T09:30:00+07:00"]);
  });

  it("keeps the session-cumulative value of the last minute in a minute bucket", () => {
    const mins = [
      b("2026-10-14T09:15:00+07:00", 1, 1, 1, 1, 1, 10e9),
      b("2026-10-14T09:16:00+07:00", 1, 1, 1, 1, 1, 15e9),
      b("2026-10-14T09:30:00+07:00", 1, 1, 1, 1, 1, 21e9),
      b("2026-10-14T09:31:00+07:00", 1, 1, 1, 1, 1, null),
    ];
    expect(resample(mins, "15m").map((x) => x.value)).toEqual([15e9, 21e9]);
  });

  it("keeps value null when any bar in the bucket lacks it", () => {
    expect(resample([b("2026-10-05", 1, 1, 1, 1, 1, null), b("2026-10-06", 1, 1, 1, 1, 1)], "1w")[0].value).toBeNull();
  });

  it("does not mutate the input bars", () => {
    const copy = JSON.parse(JSON.stringify(days));
    resample(days, "1w");
    expect(days).toEqual(copy);
  });

  it("returns the input untouched for native intervals", () => {
    expect(resample(days, "1d")).toBe(days);
    expect(resample(days, "1m")).toBe(days);
    expect(resample(days, "1h")).toBe(days);
  });
});
