export function compactNumber(n: number): string {
  if (n >= 1e9) {
    var b = n / 1e9;
    if (b.toFixed(2) !== "1000.00") return b.toFixed(2) + "B";
    return (b / 1000).toFixed(2) + "T";
  }
  if (n >= 1e6) {
    var m = n / 1e6;
    if (m.toFixed(2) !== "1000.00") return m.toFixed(2) + "M";
    return (m / 1000).toFixed(2) + "B";
  }
  if (n >= 1e3) {
    var k = n / 1e3;
    var decimals = n < 10_000 ? 2 : 1;
    var kStr = k.toFixed(decimals);
    if (parseFloat(kStr) < 1000) return kStr + "K";
    return (k / 1000).toFixed(2) + "M";
  }
  return String(n);
}

export function formatPrice(priceInK: number): string {
  return priceInK.toString() + "k";
}

export function formatPercent(pct: number): string {
  var sign = pct >= 0 ? "+" : "";
  return sign + pct.toFixed(2) + "%";
}
