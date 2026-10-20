import { Bar } from "../../src/types";

let day = 0;

function nextTime(): string {
  return new Date(Date.UTC(2026, 0, 1) + day++ * 86400000).toISOString().substring(0, 10);
}

export function resetClock(): void {
  day = 0;
}

/** Bar around a close with a small default range; override any field. */
export function bar(close: number, p: Partial<Bar> = {}): Bar {
  return {
    time: nextTime(),
    open: close,
    high: close * 1.005,
    low: close * 0.995,
    close,
    volume: 1000,
    value: null,
    ...p,
  };
}

/** n bars moving by `step` percent per bar from `start`. */
export function walk(n: number, start: number, step: number, volume = 1000): Bar[] {
  const out: Bar[] = [];
  let p = start;
  for (let i = 0; i < n; i++) {
    const next = p * (1 + step / 100);
    out.push(
      bar(next, {
        open: p,
        high: Math.max(p, next) * 1.002,
        low: Math.min(p, next) * 0.998,
        volume,
      })
    );
    p = next;
  }
  return out;
}

/** Bars whose closes follow `closes` exactly, high/low at +-spread. */
export function series(closes: number[], spread = 0.3): Bar[] {
  return closes.map((c) => bar(c, { high: c + spread, low: c - spread }));
}
