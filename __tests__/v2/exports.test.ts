import * as pkg from "../../src";

describe("package entry", () => {
  it("exposes only the v2 surface", () => {
    expect(Object.keys(pkg).sort()).toEqual(
      [
        "ApiError",
        "DataUnavailableError",
        "InvalidParameterError",
        "InvalidSymbolError",
        "NetworkError",
        "ParseError",
        "RateLimitError",
        "VnstockError",
        "createClient",
        "memoryStorage",
        "vn",
      ].sort()
    );
  });

  it("vn is a ready client and handles cost no network", () => {
    expect(typeof pkg.vn.stock).toBe("function");
    expect(typeof pkg.vn.market.breadth).toBe("function");
    expect(pkg.vn.stock("FPT").symbol).toBe("FPT");
  });

  it("createClient builds independent clients", () => {
    const a = pkg.createClient({ storage: pkg.memoryStorage() });
    expect(a).not.toBe(pkg.vn);
    expect(typeof a.screen).toBe("function");
  });

  it("no longer carries the v1 entry points", () => {
    for (const name of ["default", "stock", "commodity", "market", "news", "init", "Vnstock", "watchlist", "realtime", "quickQuote", "sma"]) {
      expect(pkg).not.toHaveProperty(name);
    }
  });
});
