function trim(n: number, digits: number): string {
  const f = Math.pow(10, digits);
  return (Math.round(n * f) / f).toString();
}

/** Stock price in dong as the price board shows it: 125800 -> "125.8k", 12350 -> "12.35k". */
export function price(dong: number): string {
  return trim(dong / 1000, 2) + "k";
}

/** Turnover and flows: 392496000000 -> "392.5 tỷ". */
export function money(dong: number): string {
  const a = Math.abs(dong);
  if (a >= 1e12) return trim(dong / 1e12, 1) + " nghìn tỷ";
  if (a >= 1e9) return trim(dong / 1e9, 1) + " tỷ";
  if (a >= 1e6) return trim(dong / 1e6, 1) + " triệu";
  return String(dong);
}
