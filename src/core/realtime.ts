import { RealtimeQuote } from "../models/normalized";

const DEFAULT_URL = "wss://iboard-pushstream.ssi.com.vn/realtime";

export interface RealtimeOptions {
  url?: string;
  onMessage?: (msg: any) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (err: any) => void;
}

export interface SubscribeOptions {
  symbols: string[];
  boardIds?: string[];
  component?: string;
}

function createWebSocket(url: string): any {
  if (typeof window !== "undefined" && window.WebSocket) {
    return new window.WebSocket(url);
  }
  const WS = require("ws");
  return new WS(url);
}

function connect(options: RealtimeOptions = {}): any {
  const { url = DEFAULT_URL, onMessage, onOpen, onClose, onError } = options;
  const socket = createWebSocket(url);

  if (onOpen) socket.onopen = onOpen;
  if (onMessage) socket.onmessage = (msg: any) => onMessage(msg.data || msg);
  if (onError) socket.onerror = onError;
  if (onClose) socket.onclose = onClose;

  return socket;
}

function subscribe(socket: any, options: SubscribeOptions): void {
  const { symbols, boardIds = ["MAIN"], component = "priceTableEquities" } = options;

  if (socket.readyState !== 1) {
    throw new Error("WebSocket is not open");
  }

  socket.send(
    JSON.stringify({
      type: "sub",
      topic: "stockRealtimeBySymbolsAndBoards",
      variables: { symbols, boardIds },
      component,
    })
  );
}

function parseData(str: string): RealtimeQuote {
  const parts = str.split("|");

  return {
    exchange: parts[0] || "",
    symbol: (parts[1] || "").split("#")[1] || "",
    bidPrices: [
      { price: Number(parts[2]) / 1000, volume: Number(parts[3]) },
      { price: Number(parts[4]) / 1000, volume: Number(parts[5]) },
      { price: Number(parts[6]) / 1000, volume: Number(parts[7]) },
    ],
    askPrices: [
      { price: Number(parts[22]) / 1000, volume: Number(parts[23]) },
      { price: Number(parts[24]) / 1000, volume: Number(parts[25]) },
      { price: Number(parts[26]) / 1000, volume: Number(parts[27]) },
    ],
    matched: {
      price: Number(parts[42]) / 1000,
      volume: Number(parts[43]),
      change: Number(parts[52]) / 1000,
      changePercent: Number(parts[53]) / 100,
    },
    totalBuyVolume: Number(parts[48]) || 0,
    totalBuyValue: Number(parts[49]) || 0,
    totalVolume: Number(parts[54]) || 0,
    totalValue: Number(parts[55]) || 0,
    side: parts[66] === "b" ? "buy" : "sell",
    lastUpdated: Number(parts[65]) || 0,
  };
}

export const realtime = { connect, subscribe, parseData };
export default realtime;
