import { realtime } from "../src/core/realtime";

// Mock ws module
jest.mock("ws", () => {
  return class MockWebSocket {
    onopen: any;
    onmessage: any;
    onerror: any;
    onclose: any;
    readyState = 1;
    send = jest.fn();
    close = jest.fn();
  };
});

describe("Realtime", () => {
  it("should parse real SSI WebSocket data correctly", () => {
    // Real ACB data from SSI WebSocket
    const raw = "MAIN|S#ACB|23550|4400|23500|282300|23450|228700|||||||||||||||23600|143700|23650|121800|23700|70600|||||||||||||||23550|900|23700|hose|23500|23569.13|144892|3426335000|132400|3122040000|-250|-1.05|2245400|52922115000||||25450|22150|23800||||129163175|s|N||||0|0|VSDASBXX||23700|||||||||||||||||||||23";

    const result = realtime.parseData(raw);

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

  it("should connect and return socket", () => {
    const socket = realtime.connect();
    expect(socket).toBeDefined();
  });

  it("should subscribe to symbols", () => {
    const socket = realtime.connect();
    realtime.subscribe(socket, { symbols: ["VCI"] });
    expect(socket.send).toHaveBeenCalled();
  });
});
