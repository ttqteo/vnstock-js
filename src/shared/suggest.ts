function distance(a: string, b: string): number {
  const d: number[][] = [];
  for (let i = 0; i <= a.length; i++) d.push([i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/** Closest candidate within edit distance 2, or null. Ties go to the earlier candidate. */
export function closest(input: string, candidates: string[]): string | null {
  const target = input.toUpperCase();
  let best: string | null = null;
  let bestD = 3;
  for (const c of candidates) {
    const dd = distance(target, c.toUpperCase());
    if (dd < bestD) {
      best = c;
      bestD = dd;
    }
  }
  return best;
}
