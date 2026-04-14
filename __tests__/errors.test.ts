import {
  VnstockError,
  NetworkError,
  RateLimitError,
  ApiError,
  InvalidSymbolError,
  InvalidParameterError,
  ParseError,
  NotInitializedError,
  DataUnavailableError,
} from "../src/errors";

describe("Error taxonomy", () => {
  describe("VnstockError", () => {
    it("is instanceof Error", () => {
      const err = new VnstockError("boom", "NETWORK_ERROR");
      expect(err).toBeInstanceOf(Error);
    });

    it("has name, message, and code", () => {
      const err = new VnstockError("something broke", "API_ERROR");
      expect(err.name).toBe("VnstockError");
      expect(err.message).toBe("something broke");
      expect(err.code).toBe("API_ERROR");
    });

    it("stores optional cause", () => {
      const original = new Error("root cause");
      const err = new VnstockError("wrapped", "PARSE_ERROR", original);
      expect(err.cause).toBe(original);
    });

    it("has no cause when not provided", () => {
      const err = new VnstockError("no cause", "NETWORK_ERROR");
      expect(err.cause).toBeUndefined();
    });
  });

  describe("NetworkError", () => {
    it("extends VnstockError", () => {
      const err = new NetworkError("timeout");
      expect(err).toBeInstanceOf(VnstockError);
      expect(err).toBeInstanceOf(Error);
    });

    it("has code NETWORK_ERROR", () => {
      const err = new NetworkError("connection refused");
      expect(err.code).toBe("NETWORK_ERROR");
      expect(err.name).toBe("NetworkError");
    });

    it("stores cause", () => {
      const original = new Error("ECONNREFUSED");
      const err = new NetworkError("connection refused", original);
      expect(err.cause).toBe(original);
    });
  });

  describe("RateLimitError", () => {
    it("extends NetworkError and VnstockError", () => {
      const err = new RateLimitError();
      expect(err).toBeInstanceOf(NetworkError);
      expect(err).toBeInstanceOf(VnstockError);
      expect(err).toBeInstanceOf(Error);
    });

    it("has code RATE_LIMIT and statusCode 429", () => {
      const err = new RateLimitError();
      expect(err.code).toBe("RATE_LIMIT");
      expect(err.statusCode).toBe(429);
      expect(err.name).toBe("RateLimitError");
    });

    it("uses default message when none provided", () => {
      const err = new RateLimitError();
      expect(err.message).toBe("Rate limit exceeded (HTTP 429)");
    });

    it("accepts custom message and cause", () => {
      const cause = new Error("throttled");
      const err = new RateLimitError("slow down", cause);
      expect(err.message).toBe("slow down");
      expect(err.cause).toBe(cause);
    });
  });

  describe("ApiError", () => {
    it("extends VnstockError", () => {
      const err = new ApiError("not found", 404);
      expect(err).toBeInstanceOf(VnstockError);
    });

    it("has statusCode and code API_ERROR", () => {
      const err = new ApiError("server error", 500);
      expect(err.statusCode).toBe(500);
      expect(err.code).toBe("API_ERROR");
      expect(err.name).toBe("ApiError");
    });
  });

  describe("InvalidSymbolError", () => {
    it("stores symbol in message", () => {
      const err = new InvalidSymbolError("XYZ123");
      expect(err.message).toContain("XYZ123");
      expect(err.code).toBe("INVALID_SYMBOL");
      expect(err.name).toBe("InvalidSymbolError");
    });

    it("extends VnstockError", () => {
      const err = new InvalidSymbolError("BAD");
      expect(err).toBeInstanceOf(VnstockError);
    });
  });

  describe("InvalidParameterError", () => {
    it("stores param name and value in message", () => {
      const err = new InvalidParameterError("interval", "5y");
      expect(err.message).toContain("interval");
      expect(err.message).toContain("5y");
      expect(err.code).toBe("INVALID_PARAMETER");
      expect(err.name).toBe("InvalidParameterError");
    });

    it("includes allowed values when provided", () => {
      const err = new InvalidParameterError("interval", "5y", ["1d", "1w", "1m"]);
      expect(err.message).toContain("1d");
      expect(err.message).toContain("1w");
      expect(err.message).toContain("1m");
    });

    it("works without allowed values", () => {
      const err = new InvalidParameterError("count", -1);
      expect(err.message).toContain("count");
      expect(err.message).toContain("-1");
      expect(err.code).toBe("INVALID_PARAMETER");
    });

    it("extends VnstockError", () => {
      const err = new InvalidParameterError("x", null);
      expect(err).toBeInstanceOf(VnstockError);
    });
  });

  describe("ParseError", () => {
    it("wraps original error", () => {
      const original = new SyntaxError("Unexpected token <");
      const err = new ParseError("Failed to parse response", original);
      expect(err.cause).toBe(original);
      expect(err.code).toBe("PARSE_ERROR");
      expect(err.name).toBe("ParseError");
    });

    it("extends VnstockError", () => {
      const err = new ParseError("bad json");
      expect(err).toBeInstanceOf(VnstockError);
    });
  });
});

describe("NotInitializedError", () => {
  it("extends VnstockError with code NOT_INITIALIZED", () => {
    const err = new NotInitializedError();
    expect(err).toBeInstanceOf(VnstockError);
    expect(err.code).toBe("NOT_INITIALIZED");
    expect(err.message).toMatch(/init/i);
  });
});

describe("DataUnavailableError", () => {
  it("extends VnstockError with code DATA_UNAVAILABLE", () => {
    const cause = new Error("network down");
    const err = new DataUnavailableError("symbols", cause);
    expect(err).toBeInstanceOf(VnstockError);
    expect(err.code).toBe("DATA_UNAVAILABLE");
    expect(err.message).toContain("symbols");
    expect(err.cause).toBe(cause);
  });
});
