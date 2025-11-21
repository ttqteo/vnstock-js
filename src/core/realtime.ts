type RealtimeOptions = {
  url?: string;
  onMessage?: (msg: any) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (err: any) => void;
};

function connect(options: RealtimeOptions = {}) {
  const { url = "wss://iboard-pushstream.ssi.com.vn/realtime", onMessage, onOpen, onClose, onError } = options;

  const socket =
    typeof window !== "undefined"
      ? new WebSocket(url) // browser
      : new (require("ws"))(url); // node

  socket.onopen = () => {
    if (onOpen) onOpen();
    // Có thể send message subscribe tại đây
    // socket.send(JSON.stringify({type: 'subscribe', symbol: 'FPT'}))
  };

  socket.onmessage = (event: any) => {
    let data;
    try {
      data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
    } catch (e) {
      data = event.data;
    }
    if (onMessage) onMessage(data);
  };

  socket.onerror = (err: any) => {
    if (onError) onError(err);
  };

  socket.onclose = () => {
    if (onClose) onClose();
  };

  return socket;
}

type SubscribeOptions = {
  symbols: string[];
  boardIds?: string[]; // mặc định là ['MAIN']
  component?: string; // mặc định là 'priceTableEquities'
};

export function subscribe(socket: WebSocket, { symbols, boardIds = ["MAIN"], component = "priceTableEquities" }: SubscribeOptions) {
  if (!socket || socket.readyState !== 1) {
    console.warn("Socket not ready");
    return;
  }

  const message = {
    type: "sub",
    topic: "stockRealtimeBySymbolsAndBoards",
    variables: {
      symbols,
      boardIds,
    },
    component,
  };

  socket.send(JSON.stringify(message));
}

export function parseData(str: string) {
  const parts = str.split("|");

  return {
    board: parts[0],
    symbol: parts[1].split("#")[1],
    bidPrices: [
      { price: parts[2], volume: parts[3] },
      { price: parts[4], volume: parts[5] },
      { price: parts[6], volume: parts[7] },
    ],
    askPrices: [
      { price: parts[24], volume: parts[25] },
      { price: parts[26], volume: parts[27] },
      { price: parts[28], volume: parts[29] },
    ],
    matched: {
      price: parts[48],
      volume: parts[49],
      change: parts[50],
      percent: parts[51],
    },
    marketValue: {
      matchedValue: parts[52],
      totalValue: parts[53],
    },
    totalBuyVolume: parts[54],
    totalBuyValue: parts[55],
    totalVolume: parts[60],
    totalValue: parts[61],
    side: parts[63], // s or b (sell/buy)
    lastUpdated: Number(parts[65]),
  };
}

const realtime = {
  connect,
  subscribe,
  parseData,
};

export default realtime;
