import { handlePortfolio } from "../../src/cli/commands/portfolio";
import { textResponse } from "../../src/cli/mcp/formatters";

function setup(saved: any = { positions: [] }) {
  let stored = saved;
  const portfolio: any = {
    load: jest.fn(async () => stored),
    save: jest.fn(async (input: any) => {
      stored = input;
    }),
  };
  const handlers: any = { portfolio_summary: jest.fn(async () => textResponse("Danh mục ngày 2026-10-19: NAV 12.7 triệu", { totals: {} })) };
  return { client: { portfolio } as any, handlers, stored: () => stored };
}

describe("handlePortfolio", () => {
  it("shows the saved holdings through portfolio_summary", async () => {
    const s = setup();
    expect(await handlePortfolio(s.client, s.handlers, { json: false })).toContain("NAV 12.7 triệu");
    expect(s.handlers.portfolio_summary).toHaveBeenCalledWith({});
  });

  it("adds a position and averages the cost of the same symbol and broker", async () => {
    const s = setup({ positions: [{ symbol: "FPT", quantity: 100, cost: 120000, broker: "DNSE" }], cash: 1000000 });
    await handlePortfolio(s.client, s.handlers, { json: false, action: "add", args: ["fpt", "100", "130000"], broker: "DNSE" });
    await handlePortfolio(s.client, s.handlers, { json: false, action: "add", args: ["VCB", "200", "58000"] });
    expect(s.stored()).toEqual({
      positions: [
        { symbol: "FPT", quantity: 200, cost: 125000, broker: "DNSE" },
        { symbol: "VCB", quantity: 200, cost: 58000 },
      ],
      cash: 1000000,
    });
  });

  it("removes a symbol and sets cash in total or per broker", async () => {
    const s = setup({
      positions: [
        { symbol: "FPT", quantity: 100, cost: 120000 },
        { symbol: "VCB", quantity: 1, cost: 1 },
      ],
    });
    await handlePortfolio(s.client, s.handlers, { json: false, action: "remove", args: ["fpt"] });
    expect(s.stored().positions.map((p: any) => p.symbol)).toEqual(["VCB"]);
    await handlePortfolio(s.client, s.handlers, { json: false, action: "cash", args: ["5000000"] });
    expect(s.stored().cash).toBe(5000000);
    await handlePortfolio(s.client, s.handlers, { json: false, action: "cash", args: ["2000000"], broker: "TCBS" });
    expect(s.stored().cash).toEqual({ default: 5000000, TCBS: 2000000 });
  });

  it("rejects costs given in thousand dong and unknown actions", async () => {
    const s = setup();
    await expect(handlePortfolio(s.client, s.handlers, { json: false, action: "add", args: ["FPT", "100", "120"] })).rejects.toThrow("120000");
    await expect(handlePortfolio(s.client, s.handlers, { json: false, action: "add", args: ["FPT"] })).rejects.toThrow("portfolio add");
    await expect(handlePortfolio(s.client, s.handlers, { json: false, action: "sell", args: [] })).rejects.toThrow("add, remove, cash");
    expect(s.client.portfolio.save).not.toHaveBeenCalled();
  });
});
