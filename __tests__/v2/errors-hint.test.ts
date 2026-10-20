import { DataUnavailableError, InvalidParameterError, InvalidSymbolError, RateLimitError, VnstockError } from "../../src/errors";
import * as allErrors from "../../src/errors";
import { closest } from "../../src/shared/suggest";

describe("hints", () => {
  it("serializes hint with the error", () => {
    const e = new InvalidParameterError("range", "6m", ["6mo"], 'Use "6mo".');
    expect(JSON.parse(JSON.stringify(e))).toMatchObject({ code: "INVALID_PARAMETER", hint: 'Use "6mo".' });
  });

  it("serializes name, code, message, hint and cause", () => {
    const cause = new Error("socket hang up");
    const e = new VnstockError("boom", "NETWORK_ERROR", cause, "Retry later.");
    expect(JSON.parse(JSON.stringify(e))).toEqual({
      name: "VnstockError",
      code: "NETWORK_ERROR",
      message: "boom",
      hint: "Retry later.",
      cause: { name: "Error", message: "socket hang up" },
    });
  });

  it("omits hint and cause from JSON when absent", () => {
    const json = JSON.parse(JSON.stringify(new VnstockError("boom", "API_ERROR")));
    expect(json).toEqual({ name: "VnstockError", code: "API_ERROR", message: "boom" });
  });

  it("keeps hint undefined when not given", () => {
    expect(new VnstockError("boom", "API_ERROR").hint).toBeUndefined();
    expect(new InvalidParameterError("count", -1).hint).toBeUndefined();
    expect(new RateLimitError().hint).toBeUndefined();
  });

  it("suggests the closest symbol", () => {
    expect(closest("FTP", ["FPT", "VCB", "FTS"])).toBe("FPT");
    expect(closest("ZZZZZ", ["FPT", "VCB"])).toBeNull();
  });

  it("matches case-insensitively and returns the candidate as listed", () => {
    expect(closest("ftp", ["FPT", "VCB"])).toBe("FPT");
  });

  it("returns null for an empty candidate list", () => {
    expect(closest("FPT", [])).toBeNull();
  });

  it("puts the suggestion in InvalidSymbolError", () => {
    const e = new InvalidSymbolError("FTP", "FPT");
    expect(e.message).toBe('Unknown symbol "FTP".');
    expect(e.hint).toBe('Did you mean "FPT"?');
    expect(e.code).toBe("INVALID_SYMBOL");
  });

  it("has no hint on InvalidSymbolError without a suggestion", () => {
    const e = new InvalidSymbolError("X");
    expect(e.message).toBe('Unknown symbol "X".');
    expect(e.hint).toBeUndefined();
  });

  it("keeps the base class", () => {
    expect(new InvalidSymbolError("X")).toBeInstanceOf(VnstockError);
  });

  it("has no NotInitializedError now that init() is gone", () => {
    expect(Object.keys(allErrors)).not.toContain("NotInitializedError");
  });

  it("gives DataUnavailableError a connectivity hint", () => {
    const cause = new Error("offline");
    const e = new DataUnavailableError("symbols", cause);
    expect(e.code).toBe("DATA_UNAVAILABLE");
    expect(e.cause).toBe(cause);
    expect(e.hint).toBe("Check network access to raw.githubusercontent.com, or pass storage that already holds the dataset.");
  });
});
