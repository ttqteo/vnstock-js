import axios from "axios";
import { RequestConfig, FetchOptions } from "./types";
import { headers as defaultHeaders } from "../shared/constants";
import { getDeviceId, getUserAgent, getCookieHeader, setCookies } from "../shared/session";
import { NetworkError, RateLimitError, ApiError } from "../errors";

function isRetryable(error: any): boolean {
  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") return true;
  if (error.response && error.response.status >= 500) return true;
  return false;
}

function isCloudflareRateLimit(error: any): boolean {
  if (!error.response) return false;
  var headers = error.response.headers || {};
  var hasCfRay = !!(headers["cf-ray"] || headers["CF-RAY"]);
  if (!hasCfRay) return false;
  var body = error.response.data;
  if (typeof body !== "string") return false;
  if (body.indexOf("Error 1015") !== -1) return true;
  if (body.indexOf("cloudflare") !== -1 && error.response.status >= 400) return true;
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Axios attaches the live request and socket to its errors, and those objects
// reference each other (socket -> _httpMessage -> socket). Anything that
// serializes the error then dies on a circular structure: JSON.stringify,
// structured loggers, worker IPC. Keep the fields worth debugging, drop the
// transport internals.
function toSerializableCause(error: any): Error {
  if (!error) return new Error("Unknown error");
  if (!error.isAxiosError && !error.config && !error.request) return error;

  var cause: any = new Error(error.message || "Request failed");
  cause.name = error.name || "AxiosError";
  if (error.code) cause.code = error.code;
  if (error.config) {
    cause.url = error.config.url;
    cause.method = error.config.method;
  }
  if (error.response) {
    cause.status = error.response.status;
    cause.statusText = error.response.statusText;
  }
  return cause;
}

function wrapError(error: any): never {
  var cause = toSerializableCause(error);
  if (error.response) {
    if (isCloudflareRateLimit(error)) {
      throw new RateLimitError("Cloudflare Error 1015 (rate limited)", cause);
    }
    const status: number = error.response.status;
    if (status === 429) {
      throw new RateLimitError(undefined, cause);
    }
    throw new ApiError(
      `HTTP ${status}: ${error.response.statusText || "Request failed"}`,
      status,
      cause
    );
  }
  throw new NetworkError(error.message || "Network error", cause);
}

function isVietcapUrl(url: string): boolean {
  return url.indexOf("vietcap.com.vn") !== -1;
}

function buildHeaders(url: string, override: Record<string, string> | undefined): Record<string, string> {
  var merged: Record<string, string> = {};
  if (isVietcapUrl(url)) {
    for (var k in defaultHeaders) merged[k] = (defaultHeaders as any)[k];
    merged["User-Agent"] = getUserAgent();
    merged["Device-Id"] = getDeviceId();
    merged["Cookie"] = getCookieHeader(url);
  } else {
    merged["User-Agent"] = getUserAgent();
    merged["Accept"] = "application/json, text/plain, */*";
  }
  if (override) {
    for (var ok in override) merged[ok] = override[ok];
  }
  return merged;
}

export async function fetchWithRetry<T = unknown>(
  config: RequestConfig,
  options: FetchOptions = {}
): Promise<T> {
  const { retries = 2, retryDelay = 1000, rateLimitWait = 5000 } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await axios.request({
        url: config.url,
        method: config.method,
        data: config.data,
        params: config.params,
        headers: buildHeaders(config.url, config.headers),
        timeout: 15000,
      });
      setCookies(config.url, response.headers && (response.headers as any)["set-cookie"]);
      return response.data as T;
    } catch (error: any) {
      lastError = error;
      if (
        error.response &&
        error.response.status === 429 &&
        rateLimitWait > 0 &&
        attempt < retries
      ) {
        var retryAfter = parseInt(error.response.headers && error.response.headers["retry-after"], 10);
        var waitMs = retryAfter > 0 ? Math.min(retryAfter * 1000, rateLimitWait) : rateLimitWait;
        await sleep(waitMs);
        continue;
      }
      if (isCloudflareRateLimit(error) && attempt < retries) {
        var cfWait = 30000 * Math.pow(2, attempt);
        await sleep(cfWait);
        continue;
      }
      if (attempt < retries && isRetryable(error)) {
        await sleep(retryDelay * Math.pow(2, attempt));
        continue;
      }
      wrapError(error);
    }
  }

  wrapError(lastError);
}
