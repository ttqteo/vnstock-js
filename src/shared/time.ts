const ICT_OFFSET_MS = 7 * 3600 * 1000;
const INDEX_SYMBOLS = ["VNINDEX", "VN30", "VN100", "HNXINDEX", "HNX30", "HNXUPCOMINDEX"];

function shifted(unixSeconds: number): string {
  return new Date(unixSeconds * 1000 + ICT_OFFSET_MS).toISOString();
}

export function ictDate(unixSeconds: number): string {
  return shifted(unixSeconds).substring(0, 10);
}

export function ictDateTime(unixSeconds: number): string {
  return shifted(unixSeconds).substring(0, 19) + "+07:00";
}

export function ictToday(now: number = Date.now()): string {
  return new Date(now + ICT_OFFSET_MS).toISOString().substring(0, 10);
}

export function isIndexSymbol(symbol: string): boolean {
  return INDEX_SYMBOLS.includes(symbol.toUpperCase());
}
