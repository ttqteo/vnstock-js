import { renderJson } from "../../src/cli/renderers/json";
import { renderCsv } from "../../src/cli/renderers/csv";
import { renderGrid } from "../../src/cli/renderers/table";

describe("renderJson", () => {
  it("pretty-prints object", () => {
    const out = renderJson({ a: 1, b: "x" });
    expect(out).toContain('"a": 1');
    expect(out).toContain('"b": "x"');
  });
});

describe("renderCsv", () => {
  it("renders rows with headers from first object", () => {
    const rows = [
      { symbol: "VCB", price: 59.3 },
      { symbol: "FPT", price: 76.3 },
    ];
    const out = renderCsv(rows);
    expect(out).toBe("symbol,price\nVCB,59.3\nFPT,76.3");
  });

  it("escapes commas and quotes", () => {
    const rows = [{ name: "ACME, Inc.", note: 'He said "hi"' }];
    const out = renderCsv(rows);
    expect(out).toBe('name,note\n"ACME, Inc.","He said ""hi"""');
  });

  it("returns empty string for empty array", () => {
    expect(renderCsv([])).toBe("");
  });
});

describe("renderGrid", () => {
  it("renders items in explicit-width grid", () => {
    const out = renderGrid(["A", "B", "C", "D", "E"], 3, 12);
    const lines = out.split("\n");
    expect(lines.length).toBe(3);
    expect(lines[0]).toContain("A");
    expect(lines[0]).toContain("B");
    expect(lines[2]).toContain("E");
  });

  it("pads items to column width", () => {
    const out = renderGrid(["VCB"], 5, 20);
    expect(out.length).toBeGreaterThanOrEqual(3);
  });

  it("handles single column when width is tiny", () => {
    const out = renderGrid(["A", "B", "C"], 5, 5);
    expect(out.split("\n")).toHaveLength(3);
  });

  it("handles empty array", () => {
    expect(renderGrid([], 5, 80)).toBe("");
  });
});
