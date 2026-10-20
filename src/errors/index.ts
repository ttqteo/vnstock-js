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

export type ErrorCode = "NETWORK_ERROR" | "RATE_LIMIT" | "API_ERROR" | "INVALID_SYMBOL" | "INVALID_PARAMETER" | "PARSE_ERROR" | "DATA_UNAVAILABLE";

export class VnstockError extends Error {
  readonly code: ErrorCode;
  readonly cause?: Error;
  readonly hint?: string;

  constructor(message: string, code: ErrorCode, cause?: Error, hint?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = new.target.name;
    this.code = code;
    this.cause = cause;
    this.hint = hint;
  }

  toJSON(): {
    name: string;
    code: ErrorCode;
    message: string;
    hint?: string;
    cause?: { name: string; message: string };
  } {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      hint: this.hint,
      cause: this.cause ? { name: this.cause.name, message: this.cause.message } : undefined,
    };
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
  constructor(symbol: string, suggestion?: string) {
    super('Unknown symbol "' + symbol + '".', "INVALID_SYMBOL", undefined, suggestion ? 'Did you mean "' + suggestion + '"?' : undefined);
  }
}

export class InvalidParameterError extends VnstockError {
  constructor(param: string, value: unknown, allowed?: readonly unknown[], hint?: string) {
    let msg = 'Invalid parameter "' + param + '": got ' + JSON.stringify(value);
    if (allowed && allowed.length > 0) {
      msg += ", allowed: [" + allowed.map((v) => JSON.stringify(v)).join(", ") + "]";
    }
    super(msg, "INVALID_PARAMETER", undefined, hint);
  }
}

export class ParseError extends VnstockError {
  constructor(message: string, cause?: Error) {
    super(message, "PARSE_ERROR", cause);
  }
}

export class DataUnavailableError extends VnstockError {
  readonly dataset: string;

  constructor(dataset: string, cause?: Error) {
    super(
      'Data "' + dataset + '" unavailable: fetch failed and no cache available',
      "DATA_UNAVAILABLE",
      cause,
      "Check network access to raw.githubusercontent.com, or pass storage that already holds the dataset."
    );
    this.dataset = dataset;
  }
}
