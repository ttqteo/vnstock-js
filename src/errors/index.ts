/**
 * Error taxonomy for vnstock-js.
 *
 * Hierarchy:
 *   VnstockError (base)
 *   +-- NetworkError          (timeout, connection refused, DNS)
 *   |   +-- RateLimitError    (HTTP 429)
 *   +-- ApiError              (4xx/5xx, non rate-limit)
 *   +-- InvalidSymbolError    (bad ticker symbol)
 *   +-- InvalidParameterError (bad params)
 *   +-- ParseError            (unparseable response)
 */

export type ErrorCode =
  | "NETWORK_ERROR"
  | "RATE_LIMIT"
  | "API_ERROR"
  | "INVALID_SYMBOL"
  | "INVALID_PARAMETER"
  | "PARSE_ERROR"
  | "NOT_INITIALIZED"
  | "DATA_UNAVAILABLE";

export class VnstockError extends Error {
  readonly code: ErrorCode;
  readonly cause?: Error;

  constructor(message: string, code: ErrorCode, cause?: Error) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = new.target.name;
    this.code = code;
    this.cause = cause;
  }
}

export class NetworkError extends VnstockError {
  constructor(message: string, cause?: Error) {
    super(message, "NETWORK_ERROR", cause);
  }
}

export class RateLimitError extends NetworkError {
  readonly statusCode: number;

  constructor(message?: string, cause?: Error) {
    // Pass code override via the base VnstockError constructor
    // NetworkError -> VnstockError, so we call super() which chains to VnstockError
    super(message || "Rate limit exceeded (HTTP 429)", cause);
    // Override code set by NetworkError's default "NETWORK_ERROR"
    // Since code is readonly on the base, we use Object.defineProperty
    Object.defineProperty(this, "code", { value: "RATE_LIMIT" });
    this.statusCode = 429;
  }
}

export class ApiError extends VnstockError {
  readonly statusCode: number;

  constructor(message: string, statusCode: number, cause?: Error) {
    super(message, "API_ERROR", cause);
    this.statusCode = statusCode;
  }
}

export class InvalidSymbolError extends VnstockError {
  constructor(symbol: string) {
    super('Invalid symbol: "' + symbol + '"', "INVALID_SYMBOL");
  }
}

export class InvalidParameterError extends VnstockError {
  constructor(param: string, value: unknown, allowed?: readonly unknown[]) {
    var msg = 'Invalid parameter "' + param + '": got ' + JSON.stringify(value);
    if (allowed && allowed.length > 0) {
      msg += ", allowed: [" + allowed.map(function (v) { return JSON.stringify(v); }).join(", ") + "]";
    }
    super(msg, "INVALID_PARAMETER");
  }
}

export class ParseError extends VnstockError {
  constructor(message: string, cause?: Error) {
    super(message, "PARSE_ERROR", cause);
  }
}

export class NotInitializedError extends VnstockError {
  constructor(message?: string) {
    super(
      message ||
        "vnstock-js not initialized. Call `await vnstock.init()` once at startup before using Directory or Calendar APIs.",
      "NOT_INITIALIZED"
    );
  }
}

export class DataUnavailableError extends VnstockError {
  readonly dataset: string;

  constructor(dataset: string, cause?: Error) {
    super(
      'Data "' + dataset + '" unavailable: fetch failed and no cache available',
      "DATA_UNAVAILABLE",
      cause
    );
    this.dataset = dataset;
  }
}
