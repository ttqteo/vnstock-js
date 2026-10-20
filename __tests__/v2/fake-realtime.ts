import { RealtimeQuote } from "../../src/models/normalized";

export function fakeRealtime() {
  const handlers: Record<string, ((x: any) => void)[]> = {};
  const rt = {
    calls: [] as unknown[][],
    on(event: string, fn: (x: any) => void) {
      (handlers[event] = handlers[event] || []).push(fn);
    },
    subscribe(symbols: string[]) {
      rt.calls.push(["sub", symbols]);
    },
    unsubscribe(symbols: string[]) {
      rt.calls.push(["unsub", symbols]);
    },
    connect() {
      rt.calls.push(["connect"]);
    },
    disconnect() {
      rt.calls.push(["disconnect"]);
    },
    emit(event: string, x: unknown) {
      for (const fn of handlers[event] || []) fn(x);
    },
  };
  return rt;
}

export function realtimeQuote(symbol: string, price: number): RealtimeQuote {
  return {
    exchange: "hose",
    symbol,
    bidPrices: [{ price: price - 100, volume: 1000 }],
    askPrices: [{ price: price + 100, volume: 2000 }],
    matched: { price, volume: 100, change: 400, changePercent: 0.0053 },
    totalBuyVolume: 0,
    totalBuyValue: 0,
    totalVolume: 3733300,
    totalValue: 286268130000,
    side: "sell",
    lastUpdated: 0,
  };
}
