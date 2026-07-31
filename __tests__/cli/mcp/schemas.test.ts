import { tools } from "../../../src/cli/mcp/tools";
import { handlers } from "../../../src/cli/mcp/handlers";

describe("MCP tool schemas", () => {
  it("registers exactly 21 tools", () => {
    expect(tools.length).toBe(21);
  });

  it("expected tool names present", () => {
    const names = tools.map((t) => t.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "get_quote",
        "get_history",
        "search_symbols",
        "list_symbols",
        "top_movers",
        "is_trade_day",
        "get_trading_calendar",
        "get_company_info",
        "get_dividends",
        "get_corporate_events",
        "get_ai_context",
        "to_ai_prompt",
        "compare_symbols",
        "get_market_breadth",
        "get_foreign_flow",
        "get_market_context",
        "get_news",
        "get_financials",
        "get_gold_price",
        "get_exchange_rate",
        "watchlist",
      ])
    );
  });

  it("every registered tool has a handler behind it", () => {
    const names = tools.map((t) => t.name).sort();
    expect(Object.keys(handlers).sort()).toEqual(names);
  });

  it("point-in-time tools accept as_of", () => {
    for (const name of ["get_ai_context", "to_ai_prompt", "get_market_context"]) {
      const tool = tools.find((t) => t.name === name);
      expect(tool?.inputSchema.properties).toHaveProperty("as_of");
    }
  });

  it("each tool has type object schema", () => {
    for (const t of tools) {
      expect(t.inputSchema.type).toBe("object");
      expect(typeof t.inputSchema.properties).toBe("object");
    }
  });

  it("each tool has description ≥ 50 chars (Vi + En context)", () => {
    for (const t of tools) {
      expect(t.description.length).toBeGreaterThanOrEqual(50);
    }
  });

  it("descriptions are bilingual (contain 'EN:' marker)", () => {
    for (const t of tools) {
      expect(t.description).toContain("EN:");
    }
  });

  it("required fields exist in properties", () => {
    for (const t of tools) {
      const required = t.inputSchema.required || [];
      for (const field of required) {
        expect(t.inputSchema.properties).toHaveProperty(field);
      }
    }
  });

  it("tool names are unique", () => {
    const names = tools.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
