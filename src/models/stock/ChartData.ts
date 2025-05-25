export interface ChartData {
  symbol: string;
  o: number[];
  h: number[];
  l: number[];
  c: number[];
  v: number[];
  t: number[];
  accumulatedVolume: number[];
  accumulatedValue: number[];
  minBatchTruncTime: number;
}
