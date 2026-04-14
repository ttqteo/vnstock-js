import { RealtimeClient, parseData, create } from "../src/realtime";
import { loadFixture, incomingQuoteLines } from "./utils/realtime-fixture";

const FIXTURE_NAME = "session-2026-04-14T06-32-07-325Z.jsonl";

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
      close: jest.fn(() => {
        mockInstance.readyState = 3;
        if (mockInstance.onclose) mockInstance.onclose();
      }),
    };
    return mockInstance;
  };
});

function openSocket() {
  mockInstance.readyState = 1;
  if (mockInstance.onopen) mockInstance.onopen();
}

function receiveMessage(data: string) {
  if (mockInstance.onmessage) mockInstance.onmessage({ data });
}

describe("parseData (fixture-based)", () => {
  const fixture = loadFixture(FIXTURE_NAME);
  const quotes = incomingQuoteLines(fixture);
  const allowedSymbols = new Set(["VCB", "FPT", "MBB"]);

  it("fixture contains at least 20 quote lines", () => {
    expect(quotes.length).toBeGreaterThan(20);
  });

  it("every captured quote parses without throwing", () => {
    for (const raw of quotes) {
      expect(() => parseData(raw)).not.toThrow();
    }
  });

  it("every quote has a valid known symbol and positive matched price", () => {
    for (const raw of quotes) {
      const q = parseData(raw);
      expect(allowedSymbols.has(q.symbol)).toBe(true);
      expect(q.matched.price).toBeGreaterThan(0);
      expect(q.bidPrices.length).toBe(3);
      expect(q.askPrices.length).toBe(3);
    }
  });

  it("throws ParseError on malformed input that lacks expected fields", () => {
    expect(() => parseData(null as any)).toThrow();
  });
});

describe("RealtimeClient message routing", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockInstance = null;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("emits 'quote' on pipe-delimited message", () => {
    const client = new RealtimeClient({ symbols: ["VCB"] });
    const onQuote = jest.fn();
    client.on("quote", onQuote);
    client.connect();
    openSocket();

    const raw =
      "MAIN|S#VCB|59300|197000|59200|244200|59100|139800|||||||||||||||59400|155900|59500|116800|59600|118800|||||||||||||||59300|1000|59600|hose|59300|59400|100|1000000|50|500000|0|0|1000|1000000||||60500|58100|59300||||0|s|N||||0|0|VSDVCBX||59600|||||||||||||||||||||59";
    receiveMessage(raw);

    expect(onQuote).toHaveBeenCalledTimes(1);
    expect(onQuote.mock.calls[0][0].symbol).toBe("VCB");
  });

  it("silently ignores {result:'complete'} unsub ack", () => {
    const client = new RealtimeClient();
    const onQuote = jest.fn();
    const onError = jest.fn();
    client.on("quote", onQuote);
    client.on("error", onError);
    client.connect();
    openSocket();

    receiveMessage('{"result":"complete","type":"unsub","topic":"stockRealtimeBySymbolsAndBoards","variables":{"symbols":["VCB"],"boardIds":["MAIN"]},"component":"priceTableEquities"}');

    expect(onQuote).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it("emits 'error' on JSON error message", () => {
    const client = new RealtimeClient();
    const onError = jest.fn();
    client.on("error", onError);
    client.connect();
    openSocket();

    receiveMessage('{"error":"Invalid symbol"}');

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].message).toContain("Invalid symbol");
  });

  it("silently ignores plain string (e.g. Subscribed ack)", () => {
    const client = new RealtimeClient();
    const onQuote = jest.fn();
    const onError = jest.fn();
    client.on("quote", onQuote);
    client.on("error", onError);
    client.connect();
    openSocket();

    receiveMessage("Subscribed stockRealtimeBySymbolsAndBoards");

    expect(onQuote).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it("silently ignores malformed JSON", () => {
    const client = new RealtimeClient();
    const onError = jest.fn();
    client.on("error", onError);
    client.connect();
    openSocket();

    receiveMessage("{not valid json");

    expect(onError).not.toHaveBeenCalled();
  });
});

describe("RealtimeClient lifecycle", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockInstance = null;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("emits 'connected' on socket open and sends initial subscription", () => {
    const client = new RealtimeClient({ symbols: ["VCB", "FPT"] });
    const onConnected = jest.fn();
    client.on("connected", onConnected);

    client.connect();
    openSocket();

    expect(onConnected).toHaveBeenCalledTimes(1);
    expect(mockInstance.send).toHaveBeenCalledTimes(1);
    const sent = JSON.parse(mockInstance.send.mock.calls[0][0]);
    expect(sent.type).toBe("sub");
    expect(sent.variables.symbols).toEqual(["VCB", "FPT"]);
  });

  it("subscribe() after connected sends sub message", () => {
    const client = new RealtimeClient();
    client.connect();
    openSocket();
    mockInstance.send.mockClear();

    client.subscribe(["ACB"]);

    expect(mockInstance.send).toHaveBeenCalledTimes(1);
    const sent = JSON.parse(mockInstance.send.mock.calls[0][0]);
    expect(sent.type).toBe("sub");
    expect(sent.variables.symbols).toEqual(["ACB"]);
  });

  it("unsubscribe() sends unsub message with correct schema", () => {
    const client = new RealtimeClient({ symbols: ["VCB"] });
    client.connect();
    openSocket();
    mockInstance.send.mockClear();

    client.unsubscribe(["VCB"]);

    expect(mockInstance.send).toHaveBeenCalledTimes(1);
    const sent = JSON.parse(mockInstance.send.mock.calls[0][0]);
    expect(sent).toEqual({
      type: "unsub",
      topic: "stockRealtimeBySymbolsAndBoards",
      variables: { symbols: ["VCB"], boardIds: ["MAIN"] },
      component: "priceTableEquities",
    });
  });

  it("dead-man timer closes socket after silence", () => {
    const client = new RealtimeClient({ deadManTimeout: 60000 });
    client.connect();
    openSocket();

    expect(mockInstance.close).not.toHaveBeenCalled();

    jest.advanceTimersByTime(60001);

    expect(mockInstance.close).toHaveBeenCalledTimes(1);
  });

  it("dead-man timer resets on incoming message", () => {
    const client = new RealtimeClient({ deadManTimeout: 60000 });
    client.connect();
    openSocket();

    jest.advanceTimersByTime(30000);
    receiveMessage("Subscribed something");
    jest.advanceTimersByTime(30000);

    expect(mockInstance.close).not.toHaveBeenCalled();
  });

  it("disconnect() intentional close does not trigger reconnect", () => {
    const client = new RealtimeClient();
    const onReconnecting = jest.fn();
    client.on("reconnecting", onReconnecting);
    client.connect();
    openSocket();

    client.disconnect();

    expect(mockInstance.close).toHaveBeenCalled();
    expect(onReconnecting).not.toHaveBeenCalled();
  });

  it("create() factory returns a RealtimeClient instance", () => {
    const c = create({ symbols: ["VCB"] });
    expect(c).toBeInstanceOf(RealtimeClient);
  });
});
