import vnstock from "../src/index";
import { saveTestOutput } from "./utils/testOutput";

// Mock the 'ws' module to simulate WebSocket behavior for testing
jest.mock("ws", () => {
  return class MockWebSocket {
    onopen!: () => void;
    onmessage!: (event: any) => void;
    onclose!: () => void;
    onerror!: (err: any) => void;
    readyState: number;

    constructor(url: string) {
      this.readyState = 1; // Open

      // Simulate connection delay
      setTimeout(() => {
        if (this.onopen) this.onopen();

        // Simulate receiving data after subscription (simulated delay)
        setTimeout(() => {
          if (this.onmessage) {
            // Construct a mock message string that matches the parseData expected format
            // We need at least 66 parts (index 65 is lastUpdated)
            const parts = new Array(70).fill("0");
            parts[0] = "MAIN";
            parts[1] = "MI#VCI"; // Symbol

            // Bids
            parts[2] = "45.5";
            parts[3] = "1000";
            parts[4] = "45.4";
            parts[5] = "2000";
            parts[6] = "45.3";
            parts[7] = "3000";

            // Asks
            parts[24] = "45.6";
            parts[25] = "1500";
            parts[26] = "45.7";
            parts[27] = "2500";
            parts[28] = "45.8";
            parts[29] = "3500";

            // Matched
            parts[48] = "45.55"; // Price
            parts[49] = "500"; // Volume
            parts[50] = "0.5"; // Change
            parts[51] = "1.1"; // Percent

            parts[63] = "s"; // Side
            parts[65] = "1234567890"; // LastUpdated

            const mockData = parts.join("|");

            this.onmessage({ data: mockData });
          }
        }, 100);
      }, 50);
    }

    send(data: string) {
      console.log("Mock WebSocket sent:", data);
    }

    close() {
      if (this.onclose) this.onclose();
    }
  };
});

describe("Realtime API", () => {
  // Increase timeout for network operations
  jest.setTimeout(10000);

  test("should connect, subscribe and receive data (Mocked)", (done) => {
    const symbols = ["VCI"];
    let messageReceived = false;

    console.log("Note: This test uses a mocked WebSocket to simulate data reception outside of market hours.");
    console.log("Realtime data is only available Mon-Fri, 9:00-11:30 and 13:00-15:00 GMT+7.");

    const socket = vnstock.realtime.connect({
      onOpen: () => {
        console.log("Socket connected");
        vnstock.realtime.subscribe(socket, { symbols });
      },
      onMessage: (data: any) => {
        // The first message might be a confirmation or initial data

        if (typeof data === "string" && data.includes("VCI")) {
          try {
            const parsed = vnstock.realtime.parseData(data);
            console.log("Parsed data:", parsed);
            saveTestOutput("realtime-data", parsed);

            expect(parsed).toHaveProperty("symbol", "VCI");
            expect(parsed).toHaveProperty("matched");
            expect(parsed.matched.price).toBe("45.55");

            messageReceived = true;
            socket.close();
          } catch (e) {
            console.error("Error parsing data:", e);
            done(e);
          }
        }
      },
      onError: (err: any) => {
        console.error("Socket error:", err);
        done(err);
      },
      onClose: () => {
        console.log("Socket closed");
        if (messageReceived) {
          done();
        } else {
          done(new Error("Socket closed without receiving expected data"));
        }
      },
    });
  });
});
