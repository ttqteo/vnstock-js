import { runTool, parseWhere, QUOTE_COLUMNS, GOLD_COLUMNS } from "../../src/cli/commands/tool";
import { textResponse, errorResponse } from "../../src/cli/mcp/formatters";

const quotes = [
  { symbol: "FPT", price: 125800, changePct: 1.2, volume: 3120000, value: 392496000000 },
  { symbol: "VCB", price: 59300, changePct: -0.5, volume: 1000, value: 59300000 },
];

// jest.config resets mocks before each test, so the fakes are built per test.
let handlers: any;
beforeEach(() => {
  handlers = {
    compare_symbols: jest.fn(async () => textResponse("So sánh 2 mã: FPT, VCB", quotes)),
    get_gold_price: jest.fn(async () => textResponse("Giá vàng từ btmc", [{ name: "SJC", buy: 123500000, sell: 125500000 }])),
    find_patterns: jest.fn(async () => textResponse("FPT: pattern", { zones: [] })),
    broken: jest.fn(async () => errorResponse("Thiếu tham số 'symbol'.")),
  };
});

describe("runTool", () => {
  it("prints the summary and a table of the data in readable units", async () => {
    const out = await runTool(handlers, "compare_symbols", { symbols: ["FPT", "VCB"] }, { json: false, columns: QUOTE_COLUMNS });
    expect(handlers.compare_symbols).toHaveBeenCalledWith({ symbols: ["FPT", "VCB"] });
    expect(out.split("\n")[0]).toBe("So sánh 2 mã: FPT, VCB");
    expect(out).toContain("125.8k");
    expect(out).toContain("+1.20%");
    expect(out).toContain("392.5 tỷ");
    expect(await runTool(handlers, "get_gold_price", {}, { json: false, columns: GOLD_COLUMNS })).toContain("123.5 triệu");
  });

  it("prints the data alone with --json and the summary alone without columns", async () => {
    expect(JSON.parse(await runTool(handlers, "compare_symbols", {}, { json: true }))).toEqual(quotes);
    expect(await runTool(handlers, "find_patterns", { symbol: "FPT" }, { json: false })).toBe("FPT: pattern");
  });

  it("turns a tool error into a thrown error", async () => {
    await expect(runTool(handlers, "broken", {}, { json: false })).rejects.toThrow("Thiếu tham số 'symbol'.");
  });
});

describe("parseWhere", () => {
  it("reads comma-separated comparisons into screen filters", () => {
    expect(parseWhere("pe<15, roe>=0.15,marketCap>1e12")).toEqual([
      { field: "pe", operator: "<", value: 15 },
      { field: "roe", operator: ">=", value: 0.15 },
      { field: "marketCap", operator: ">", value: 1e12 },
    ]);
    expect(parseWhere("")).toEqual([]);
    expect(() => parseWhere("pe<<15")).toThrow("pe<15,roe>0.15");
  });
});
