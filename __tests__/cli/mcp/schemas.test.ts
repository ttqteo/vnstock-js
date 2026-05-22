import { tools } from "../../../src/cli/mcp/tools";

describe("MCP tool schemas", () => {
  it("registers exactly 11 tools", () => {
    expect(tools.length).toBe(11);
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
        "get_ai_context",
        "to_ai_prompt",
        "compare_symbols",
      ])
    );
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
