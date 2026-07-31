import { injectDefaultCommand } from "../../src/cli/argv";

const COMMANDS = ["quote", "history", "search", "symbols", "market", "foreign", "mcp", "help"];

function run(...args: string[]): string[] {
  return injectDefaultCommand(["node", "vnstock", ...args], COMMANDS).slice(2);
}

describe("injectDefaultCommand", () => {
  it("turns a bare symbol into a quote command", () => {
    expect(run("MBB")).toEqual(["quote", "MBB"]);
  });

  it("accepts a comma-separated symbol list", () => {
    expect(run("VCB,FPT")).toEqual(["quote", "VCB,FPT"]);
  });

  it("leaves a known command alone", () => {
    expect(run("history", "VCB")).toEqual(["history", "VCB"]);
  });

  // The regression that prompted extracting this: `market` and `foreign` were
  // missing from a hardcoded list, so they were treated as tickers and answered
  // with an empty price row instead of running.
  it("leaves subcommands added later alone", () => {
    expect(run("market")).toEqual(["market"]);
    expect(run("foreign", "VCB")).toEqual(["foreign", "VCB"]);
  });

  it("leaves flags alone", () => {
    expect(run("--help")).toEqual(["--help"]);
    expect(run("-v")).toEqual(["-v"]);
  });

  it("leaves argv with no command alone", () => {
    expect(injectDefaultCommand(["node", "vnstock"], COMMANDS)).toEqual(["node", "vnstock"]);
  });

  it("does not touch things that cannot be tickers", () => {
    expect(run("2026-01-01")).toEqual(["2026-01-01"]);
  });

  it("does not mutate the argv it was given", () => {
    const argv = ["node", "vnstock", "MBB"];
    injectDefaultCommand(argv, COMMANDS);
    expect(argv).toEqual(["node", "vnstock", "MBB"]);
  });
});
