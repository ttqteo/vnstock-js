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
  it("should parse data into normalized format", () => {
    // Build a pipe-delimited string with enough parts (66+ elements)
    const parts = new Array(66).fill("");
    parts[0] = "MAIN";
    parts[1] = "VCI#VCI";
    parts[2] = "25500"; parts[3] = "1000";  // bid 1
    parts[4] = "25400"; parts[5] = "900";   // bid 2
    parts[6] = "25300"; parts[7] = "800";   // bid 3
    parts[24] = "26000"; parts[25] = "500"; // ask 1
    parts[26] = "26100"; parts[27] = "600"; // ask 2
    parts[28] = "26200"; parts[29] = "700"; // ask 3
    parts[48] = "25800"; parts[49] = "5000"; parts[50] = "300"; parts[51] = "1.18";
    parts[54] = "54000"; parts[55] = "55000";
    parts[60] = "60000"; parts[61] = "61000";
    parts[63] = "b";
    parts[65] = "1705276800";
    const raw = parts.join("|");

    const result = realtime.parseData(raw);

    expect(result.exchange).toBe("MAIN");
    expect(result.symbol).toBe("VCI");
    expect(result.bidPrices).toHaveLength(3);
    expect(result.bidPrices[0].price).toBe(25.5);
    expect(result.askPrices).toHaveLength(3);
    expect(result.askPrices[0].price).toBe(26.0);
    expect(result.matched.price).toBe(25.8);
    expect(result.matched.volume).toBe(5000);
    expect(result.side).toBe("buy");
    expect(result.totalVolume).toBe(60000);
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
