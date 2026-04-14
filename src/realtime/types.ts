export interface RealtimeClientOptions {
  symbols?: string[];
  url?: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  deadManTimeout?: number;
}
