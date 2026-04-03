import { RealtimeClient, parseData, create } from "../src/realtime";

// Mock ws module

let mockInstance: any;

jest.mock("ws", () => {
  return function MockWebSocket(_url: string) {
    mockInstance = {
      readyState: 0,
      onopen: null as any,
      onmessage: null as any,
      onerror: null as any,
      onclose: null as any,
      send: jest.fn(),
      close: jest.fn(),
      ping: jest.fn(),
    };
    return mockInstance;
  };
});

// Helpers

function openSocket() {
  mockInstance.readyState = 1;
  if (mockInstance.onopen) mockInstance.onopen();
}

function receiveMessage(data: string) {
  if (mockInstance.onmessage) mockInstance.onmessage({ data });
}

function closeSocket() {
  mockInstance.readyState = 3;
  if (mockInstance.onclose) mockInstance.onclose();
}

// Real ACB data from SSI WebSocket
const RAW_ACB =
  "MAIN|S#ACB|23550|4400|23500|282300|23450|228700|||||||||||||||23600|143700|23650|121800|23700|70600|||||||||||||||23550|900|23700|hose|23500|23569.13|144892|3426335000|132400|3122040000|-250|-1.05|2245400|52922115000||||25450|22150|23800||||129163175|s|N||||0|0|VSDASBXX||23700|||||||||||||||||||||23";

// Tests

describe("RealtimeClient", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockInstance = null;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("emits 'connected' on WebSocket open", (done) => {
    const client = new RealtimeClient();
    client.on("connected", () => {
      done();
    });
    client.connect();
    openSocket();
  });

  it("queues subscribe before socket is open", () => {
    const client = new RealtimeClient();
    client.connect();
    // Socket is not open yet (readyState = 0)
    client.subscribe(["HPG"]);
    expect(mockInstance.send).not.toHaveBeenCalled();

    // Now open
    openSocket();
    // The subscription should have been sent (HPG is now in symbols set, sent on open)
    expect(mockInstance.send).toHaveBeenCalled();
    const payload = JSON.parse(mockInstance.send.mock.calls[0][0]);
    expect(payload.variables.symbols).toContain("HPG");
  });

  it("sends subscription immediately when socket is open", () => {
    const client = new RealtimeClient();
    client.connect();
    openSocket();
    mockInstance.send.mockClear();

    client.subscribe(["FPT"]);
    expect(mockInstance.send).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(mockInstance.send.mock.calls[0][0]);
    expect(payload.type).toBe("sub");
    expect(payload.variables.symbols).toEqual(["FPT"]);
  });

  it("emits 'quote' with parsed data on message", (done) => {
    const client = new RealtimeClient({ symbols: ["ACB"] });
    client.on("quote", (data) => {
      expect(data.symbol).toBe("ACB");
      expect(data.matched.price).toBe(23.55);
      done();
    });
    client.connect();
    openSocket();
    receiveMessage(RAW_ACB);
  });

  it("disconnect() closes socket and prevents reconnect", () => {
    const client = new RealtimeClient();
    client.connect();
    openSocket();

    client.disconnect();
    expect(mockInstance.close).toHaveBeenCalled();
  });

  it("emits 'disconnected' and 'reconnecting' on unexpected close", () => {
    const client = new RealtimeClient({ reconnectInterval: 1000, maxReconnectAttempts: 3 });
    const disconnected = jest.fn();
    const reconnecting = jest.fn();
    client.on("disconnected", disconnected);
    client.on("reconnecting", reconnecting);

    client.connect();
    openSocket();
    closeSocket();

    expect(disconnected).toHaveBeenCalledWith("connection lost");
    expect(reconnecting).toHaveBeenCalledWith(1);
  });

  it("emits 'error' on WebSocket error", () => {
    const client = new RealtimeClient();
    const errorFn = jest.fn();
    client.on("error", errorFn);
    client.connect();
    mockInstance.onerror(new Error("ws fail"));
    expect(errorFn).toHaveBeenCalled();
    expect(errorFn.mock.calls[0][0].message).toBe("ws fail");
  });

  it("unsubscribe removes symbols from internal set", () => {
    const client = new RealtimeClient({ symbols: ["VNM", "FPT"] });
    client.unsubscribe(["VNM"]);
    client.connect();
    openSocket();

    // Only FPT should be in the subscription
    const payload = JSON.parse(mockInstance.send.mock.calls[0][0]);
    expect(payload.variables.symbols).toEqual(["FPT"]);
  });

  it("create() factory returns a RealtimeClient", () => {
    const client = create({ symbols: ["VCI"] });
    expect(client).toBeInstanceOf(RealtimeClient);
  });
});

describe("parseData", () => {
  it("correctly parses SSI pipe-delimited data", () => {
    const result = parseData(RAW_ACB);

    expect(result.exchange).toBe("MAIN");
    expect(result.symbol).toBe("ACB");

    // Bid prices (3 levels)
    expect(result.bidPrices[0]).toEqual({ price: 23.55, volume: 4400 });
    expect(result.bidPrices[1]).toEqual({ price: 23.5, volume: 282300 });
    expect(result.bidPrices[2]).toEqual({ price: 23.45, volume: 228700 });

    // Ask prices (3 levels)
    expect(result.askPrices[0]).toEqual({ price: 23.6, volume: 143700 });
    expect(result.askPrices[1]).toEqual({ price: 23.65, volume: 121800 });
    expect(result.askPrices[2]).toEqual({ price: 23.7, volume: 70600 });

    // Match
    expect(result.matched.price).toBe(23.55);
    expect(result.matched.volume).toBe(900);
    expect(result.matched.change).toBe(-0.25);
    expect(result.matched.changePercent).toBeCloseTo(-0.0105);

    // Volumes
    expect(result.totalVolume).toBe(2245400);
    expect(result.totalBuyVolume).toBe(144892);

    // Side
    expect(result.side).toBe("sell");
  });
});
