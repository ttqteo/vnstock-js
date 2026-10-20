import { headers as vciHeaders } from "../shared/constants";
import { getDeviceId, getUserAgent, getCookieHeader, setCookiesFromHeaders } from "../shared/session";
import { ApiError, NetworkError, RateLimitError } from "../errors";

export interface RequestConfig {
  url: string;
  method: "GET" | "POST";
  data?: unknown;
  params?: Record<string, string | number | boolean | null | undefined>;
  headers?: Record<string, string>;
}

export interface TransportOptions {
  /** fetch implementation; defaults to the global one. */
  fetch?: typeof fetch;
  /** Base path of a vnstock-js proxy, e.g. "/api/vnstock". Set it in browsers. */
  proxy?: string;
  /** Per-attempt timeout in ms. Default 15000. */
  timeout?: number;
  /** Extra attempts after the first. Default 2. */
  retries?: number;
  /** Base backoff in ms for network errors and 5xx, doubled per attempt. Default 1000. */
  retryDelay?: number;
  /** Longest wait in ms on HTTP 429 before retrying; 0 throws at once. Default 5000. */
  rateLimitWait?: number;
}

export interface Transport {
  request<T = unknown>(config: RequestConfig): Promise<T>;
}

/** Upstream hosts the proxy is allowed to reach, keyed by the path prefix the client uses. */
export const PROXY_ROUTES: Record<string, string> = {
  "vci-trading": "https://trading.vietcap.com.vn",
  "vci-iq": "https://iq.vietcap.com.vn",
};

function toProxyUrl(url: string, proxy: string): string {
  for (const key in PROXY_ROUTES) {
    const origin = PROXY_ROUTES[key];
    if (url.startsWith(origin + "/")) return proxy.replace(/\/$/, "") + "/" + key + url.substring(origin.length);
  }
  return url;
}

function withParams(url: string, params?: RequestConfig["params"]): string {
  if (!params) return url;
  const parts: string[] = [];
  for (const k in params) {
    const v = params[k];
    if (v === undefined || v === null) continue;
    parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(String(v)));
  }
  if (parts.length === 0) return url;
  return url + (url.includes("?") ? "&" : "?") + parts.join("&");
}

function isVietcap(url: string): boolean {
  return url.includes("vietcap.com.vn");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

class HttpFailure {
  constructor(
    public status: number,
    public statusText: string,
    public body: string,
    public headers: Headers
  ) {}
}

function isCloudflareLimit(f: HttpFailure): boolean {
  if (!f.headers.get("cf-ray")) return false;
  if (f.body.includes("Error 1015")) return true;
  return f.body.toLowerCase().includes("cloudflare") && f.status >= 400;
}

/** A plain, serializable cause: no live request or socket objects. */
function cause(url: string, method: string, extra: Record<string, unknown>): Error {
  const e: any = new Error(String(extra.message || "Request failed"));
  e.url = url;
  e.method = method;
  for (const k in extra) if (k !== "message" && extra[k] !== undefined) e[k] = extra[k];
  return e;
}

function errorCode(err: any): string | undefined {
  if (!err) return undefined;
  return err.code || (err.cause && err.cause.code) || err.name;
}

/**
 * HTTP transport on fetch with retries and error classification. Server-side it sends
 * the Vietcap session headers; with `proxy` set it rewrites Vietcap URLs to the proxy
 * and sends none (browsers cannot set them anyway).
 * @example
 * const t = createTransport({ proxy: "/api/vnstock" });
 * await t.request({ url: "https://iq.vietcap.com.vn/api/...", method: "GET" });
 */
export function createTransport(options: TransportOptions = {}): Transport {
  const doFetch: typeof fetch = options.fetch || ((input, init) => globalThis.fetch(input, init));
  const timeout = options.timeout ?? 15000;
  const retries = options.retries ?? 2;
  const retryDelay = options.retryDelay ?? 1000;
  const rateLimitWait = options.rateLimitWait ?? 5000;

  async function once(config: RequestConfig): Promise<unknown> {
    const direct = withParams(config.url, config.params);
    const url = options.proxy ? toProxyUrl(direct, options.proxy) : direct;
    const headers: Record<string, string> = { Accept: "application/json, text/plain, */*" };
    if (config.data !== undefined) headers["Content-Type"] = "application/json";
    if (!options.proxy) {
      if (isVietcap(direct)) {
        Object.assign(headers, vciHeaders);
        headers["Device-Id"] = getDeviceId();
        headers["Cookie"] = getCookieHeader(direct);
      }
      headers["User-Agent"] = getUserAgent();
    }
    Object.assign(headers, config.headers || {});

    let response: Response;
    try {
      response = await doFetch(url, {
        method: config.method,
        headers,
        body: config.data === undefined ? undefined : JSON.stringify(config.data),
        signal: AbortSignal.timeout(timeout),
      });
    } catch (err: any) {
      const timedOut = err && err.name === "TimeoutError";
      const message = timedOut ? "Request timed out after " + timeout + "ms" : (err && err.message) || "Network error";
      throw new NetworkError(message, cause(url, config.method, { message: err && err.message, code: errorCode(err) }));
    }

    let text: string;
    try {
      text = await response.text();
    } catch (err: any) {
      // Headers arrived, body did not: a transport failure, not an HTTP answer.
      throw new NetworkError(
        (err && err.message) || "Connection interrupted",
        cause(url, config.method, { message: err && err.message, status: response.status })
      );
    }

    if (!options.proxy) setCookiesFromHeaders(direct, response.headers);
    if (!response.ok) throw new HttpFailure(response.status, response.statusText, text, response.headers);
    if (text === "") return null;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  return {
    async request<T>(config: RequestConfig): Promise<T> {
      for (let attempt = 0; ; attempt++) {
        try {
          return (await once(config)) as T;
        } catch (err) {
          const last = attempt >= retries;
          if (err instanceof NetworkError) {
            if (last) throw err;
            await sleep(retryDelay * 2 ** attempt);
            continue;
          }
          if (!(err instanceof HttpFailure)) throw err;
          // Same order as the v1 pipeline: 429 wait, Cloudflare backoff, 5xx backoff, then classify.
          if (err.status === 429 && rateLimitWait > 0 && !last) {
            const ra = parseInt(err.headers.get("retry-after") || "", 10);
            await sleep(ra > 0 ? Math.min(ra * 1000, rateLimitWait) : rateLimitWait);
            continue;
          }
          const cloudflare = isCloudflareLimit(err);
          if (cloudflare && !last) {
            await sleep(30000 * 2 ** attempt);
            continue;
          }
          if (err.status >= 500 && !last) {
            await sleep(retryDelay * 2 ** attempt);
            continue;
          }
          const c = cause(config.url, config.method, { message: "HTTP " + err.status, status: err.status, statusText: err.statusText });
          if (cloudflare) throw new RateLimitError("Cloudflare Error 1015 (rate limited)", c);
          if (err.status === 429) throw new RateLimitError(undefined, c);
          throw new ApiError("HTTP " + err.status + ": " + (err.statusText || "Request failed"), err.status, c);
        }
      }
    },
  };
}

/** Shared transport with the default options. Creating it does no I/O; fetch is looked up per request. */
export const defaultTransport: Transport = createTransport();
