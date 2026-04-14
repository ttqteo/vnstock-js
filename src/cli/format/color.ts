import pc from "picocolors";

export interface ColorOptions {
  color: boolean;
}

function apply(fn: (s: string) => string, value: string, enabled: boolean): string {
  return enabled ? fn(value) : value;
}

export function priceColor(
  change: number,
  value: string,
  opts: ColorOptions
): string {
  if (change > 0) return apply(pc.green, value, opts.color);
  if (change < 0) return apply(pc.red, value, opts.color);
  return apply(pc.yellow, value, opts.color);
}

export function ceilingColor(value: string, opts: ColorOptions): string {
  return apply(pc.magenta, value, opts.color);
}

export function floorColor(value: string, opts: ColorOptions): string {
  return apply(pc.blue, value, opts.color);
}

export function refColor(value: string, opts: ColorOptions): string {
  return apply(pc.yellow, value, opts.color);
}

export function dim(value: string, opts: ColorOptions): string {
  return apply(pc.dim, value, opts.color);
}

export function bold(value: string, opts: ColorOptions): string {
  return apply(pc.bold, value, opts.color);
}
