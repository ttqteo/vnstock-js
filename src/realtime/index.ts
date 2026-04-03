import { EventEmitter } from "events";
import { RealtimeQuote } from "../models/normalized";
import { ParseError } from "../errors";
import { RealtimeClientOptions } from "./types";

export { RealtimeClientOptions } from "./types";

const DEFAULT_URL = "wss://iboard-pushstream.ssi.com.vn/realtime";

function createWebSocket(url: string): any {
  if (typeof window !== "undefined" && window.WebSocket) {
    return new window.WebSocket(url);
  }
  var WS = require("ws");
  return new WS(url);
}

export function parseData(str: string): RealtimeQuote {
  var parts = str.split("|");

  try {
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
  } catch (err) {
    throw new ParseError(
      "Failed to parse realtime data: " + (err instanceof Error ? err.message : String(err)),
      err instanceof Error ? err : undefined
    );
  }
}

export class RealtimeClient extends EventEmitter {
  private readonly url: string;
  private readonly autoReconnect: boolean;
  private readonly reconnectInterval: number;
  private readonly maxReconnectAttempts: number;
  private readonly heartbeatInterval: number;
  private readonly heartbeatTimeout: number;

  private symbols: Set<string>;
  private pendingQueue: string[] = [];
  private socket: any = null;
  private intentionalClose = false;
  private reconnectAttempts = 0;
  private heartbeatTimer: any = null;
  private heartbeatTimeoutTimer: any = null;
  private reconnectTimer: any = null;

  constructor(opts?: RealtimeClientOptions) {
    super();
    Object.setPrototypeOf(this, RealtimeClient.prototype);

    var o = opts || {};
    this.url = o.url || DEFAULT_URL;
    this.autoReconnect = o.autoReconnect !== false;
    this.reconnectInterval = o.reconnectInterval || 3000;
    this.maxReconnectAttempts = o.maxReconnectAttempts || 10;
    this.heartbeatInterval = o.heartbeatInterval || 30000;
    this.heartbeatTimeout = o.heartbeatTimeout || 10000;
    this.symbols = new Set(o.symbols || []);
  }

  connect(): void {
    this.intentionalClose = false;
    this.reconnectAttempts = 0;
    this._createSocket();
  }

  disconnect(): void {
    this.intentionalClose = true;
    this._stopHeartbeat();
    this._clearReconnectTimer();
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  subscribe(symbols: string[]): void {
    for (var i = 0; i < symbols.length; i++) {
      this.symbols.add(symbols[i]);
    }

    if (this.socket && this.socket.readyState === 1) {
      this._sendSubscription(symbols);
    } else {
      for (var j = 0; j < symbols.length; j++) {
        this.pendingQueue.push(symbols[j]);
      }
    }
  }

  unsubscribe(symbols: string[]): void {
    for (var i = 0; i < symbols.length; i++) {
      this.symbols.delete(symbols[i]);
    }
  }

  private _createSocket(): void {
    var self = this;
    this.socket = createWebSocket(this.url);

    this.socket.onopen = function () {
      self.reconnectAttempts = 0;
      self.emit("connected");

      // Send initial subscription for all tracked symbols
      var allSymbols = Array.from(self.symbols);
      if (allSymbols.length > 0) {
        self._sendSubscription(allSymbols);
      }

      // Flush pending queue
      if (self.pendingQueue.length > 0) {
        var pending = self.pendingQueue.slice();
        self.pendingQueue = [];
        // Filter out symbols already sent above
        var extra: string[] = [];
        for (var i = 0; i < pending.length; i++) {
          if (!self.symbols.has(pending[i])) {
            extra.push(pending[i]);
          }
        }
        if (extra.length > 0) {
          self._sendSubscription(extra);
        }
      }

      self._startHeartbeat();
    };

    this.socket.onmessage = function (event: any) {
      var data = event.data || event;
      // Reset heartbeat on any incoming message
      self._resetHeartbeatTimeout();

      if (typeof data === "string" && data.indexOf("|") !== -1) {
        try {
          var quote = parseData(data);
          self.emit("quote", quote);
        } catch (err) {
          self.emit("error", err instanceof Error ? err : new Error(String(err)));
        }
      }
    };

    this.socket.onclose = function () {
      self._stopHeartbeat();
      self.socket = null;

      if (!self.intentionalClose) {
        self.emit("disconnected", "connection lost");
        self._scheduleReconnect();
      }
    };

    this.socket.onerror = function (err: any) {
      self.emit("error", err instanceof Error ? err : new Error(String(err)));
    };
  }

  private _sendSubscription(symbols: string[]): void {
    if (!this.socket || this.socket.readyState !== 1) return;
    this.socket.send(
      JSON.stringify({
        type: "sub",
        topic: "stockRealtimeBySymbolsAndBoards",
        variables: { symbols: symbols, boardIds: ["MAIN"] },
        component: "priceTableEquities",
      })
    );
  }

  private _startHeartbeat(): void {
    var self = this;
    this._stopHeartbeat();
    this.heartbeatTimer = setInterval(function () {
      if (self.socket && self.socket.readyState === 1) {
        try {
          self.socket.ping();
        } catch (_e) {
          // browser WebSocket has no ping — ignore
        }
        self.heartbeatTimeoutTimer = setTimeout(function () {
          // No pong received in time — force close to trigger reconnect
          if (self.socket) {
            self.socket.close();
          }
        }, self.heartbeatTimeout);
      }
    }, this.heartbeatInterval);
  }

  private _resetHeartbeatTimeout(): void {
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }

  private _stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this._resetHeartbeatTimeout();
  }

  private _scheduleReconnect(): void {
    var self = this;
    if (!this.autoReconnect) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit("error", new Error("Max reconnect attempts reached"));
      return;
    }

    this.reconnectAttempts++;
    var delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);
    this.emit("reconnecting", this.reconnectAttempts);

    this.reconnectTimer = setTimeout(function () {
      self._createSocket();
    }, delay);
  }

  private _clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

export function create(opts?: RealtimeClientOptions): RealtimeClient {
  return new RealtimeClient(opts);
}
