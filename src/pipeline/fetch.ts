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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function wrapError(error: any): never {
  if (error.response) {
    const status: number = error.response.status;
    if (status === 429) {
      throw new RateLimitError(undefined, error);
    }
    throw new ApiError(
      `HTTP ${status}: ${error.response.statusText || "Request failed"}`,
      status,
      error
    );
  }
  throw new NetworkError(error.message || "Network error", error);
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
      if (attempt < retries && isRetryable(error)) {
        await sleep(retryDelay * Math.pow(2, attempt));
        continue;
      }
      wrapError(error);
    }
  }

  wrapError(lastError);
}
