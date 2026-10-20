import { PROXY_ROUTES } from "../transport";
import { headers as vciHeaders } from "../shared/constants";
import { getDeviceId, getUserAgent, getCookieHeader, setCookiesFromHeaders } from "../shared/session";

/** Path prefixes the proxy will forward, per upstream. Anything else is 403. */
const ALLOWED: Record<string, string[]> = {
  "vci-trading": ["/api/chart/", "/api/price/", "/api/price-alert-service/", "/priceboard"],
  "vci-iq": ["/api/iq-insight-service/"],
};

const METHODS = ["GET", "HEAD", "POST"];

export interface ProxyOptions {
  /** Path the handler is mounted at, e.g. "/api/vnstock". */
  basePath: string;
  fetch?: typeof fetch;
  /** Seconds a CDN may cache successful GET responses. 0 disables. Default 30. */
  cacheSeconds?: number;
  /** Largest request body forwarded, in bytes; anything larger is 413. Default 65536. */
  maxBodyBytes?: number;
}

const MAX_BODY_BYTES = 65536;

function isTraversal(path: string): boolean {
  let decoded = path;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    return true;
  }
  return path.includes("..") || decoded.includes("..") || decoded.includes("\\");
}

/** The body as text, or null once it passes `max` bytes; stops reading there. */
async function readLimited(req: Request, max: number): Promise<string | null> {
  if (Number(req.headers.get("content-length")) > max) return null;
  if (!req.body) return "";
  // No Buffer: this runs on Workers and edge runtimes too.
  const reader = req.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

/**
 * Web-standard request handler that forwards browser calls to the two Vietcap hosts the
 * client uses, adding the session headers browsers cannot send. Only allowlisted paths pass.
 * @example
 * const handle = createProxyHandler({ basePath: "/api/vnstock" });
 * const res = await handle(request);
 */
export function createProxyHandler(options: ProxyOptions): (req: Request) => Promise<Response> {
  const doFetch: typeof fetch = options.fetch || ((input, init) => globalThis.fetch(input, init));
  const base = options.basePath.replace(/\/$/, "");
  const cacheSeconds = options.cacheSeconds ?? 30;
  const maxBodyBytes = options.maxBodyBytes ?? MAX_BODY_BYTES;

  return async function handle(req: Request): Promise<Response> {
    const u = new URL(req.url);
    if (!u.pathname.startsWith(base + "/")) return new Response("Not found", { status: 404 });
    if (!METHODS.includes(req.method)) return new Response("Method not allowed", { status: 405, headers: { allow: METHODS.join(", ") } });
    const rest = u.pathname.substring(base.length + 1);
    const slash = rest.indexOf("/");
    const key = slash === -1 ? rest : rest.substring(0, slash);
    const path = slash === -1 ? "/" : rest.substring(slash);
    const origin = Object.prototype.hasOwnProperty.call(PROXY_ROUTES, key) ? PROXY_ROUTES[key] : undefined;
    if (!origin || isTraversal(path) || !ALLOWED[key].some((p) => path.startsWith(p))) {
      return new Response("Forbidden", { status: 403 });
    }
    const target = origin + path + u.search;
    const headers: Record<string, string> = {
      ...vciHeaders,
      "User-Agent": getUserAgent(),
      "Device-Id": getDeviceId(),
      Cookie: getCookieHeader(target),
    };
    const body = req.method === "GET" || req.method === "HEAD" ? undefined : await readLimited(req, maxBodyBytes);
    if (body === null) return new Response("Payload too large", { status: 413 });
    let upstream: Response;
    try {
      upstream = await doFetch(target, { method: req.method, headers, body });
    } catch {
      return new Response("Bad gateway", { status: 502 });
    }
    setCookiesFromHeaders(target, upstream.headers);
    // Upstream HTML (a Cloudflare page, a reflected error) must not run as a page on this origin.
    const out = new Headers({
      "content-type": upstream.headers.get("content-type") || "application/json",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; sandbox",
    });
    if (req.method === "GET" && upstream.ok && cacheSeconds > 0) {
      out.set("cache-control", "public, s-maxage=" + cacheSeconds + ", stale-while-revalidate=" + cacheSeconds * 2);
    }
    return new Response(await upstream.text(), { status: upstream.status, headers: out });
  };
}

/**
 * Next.js App Router adapter.
 * @example
 * // app/api/vnstock/[...path]/route.ts
 * export const { GET, POST } = nextHandler();
 */
export function nextHandler(options: Partial<ProxyOptions> = {}) {
  const handle = createProxyHandler({ basePath: "/api/vnstock", ...options });
  return { GET: handle, POST: handle };
}

/**
 * Cloudflare Workers / Deno / Bun adapter.
 * @example
 * export default { fetch: workerHandler() };
 */
export function workerHandler(options: Partial<ProxyOptions> = {}) {
  return createProxyHandler({ basePath: "/api/vnstock", ...options });
}

/**
 * Express / Connect middleware.
 * @example
 * app.use(expressHandler());
 */
export function expressHandler(options: Partial<ProxyOptions> = {}) {
  const basePath = options.basePath || "/api/vnstock";
  const maxBodyBytes = options.maxBodyBytes ?? MAX_BODY_BYTES;
  const handle = createProxyHandler({ ...options, basePath });
  return async (req: any, res: any, next: any) => {
    const url = String(req.originalUrl || req.url);
    if (!url.startsWith(basePath)) return next();
    try {
      const chunks: Uint8Array[] = [];
      let size = 0;
      for await (const c of req) {
        size += c.length;
        if (size > maxBodyBytes) {
          res.status(413);
          res.send(Buffer.from("Payload too large"));
          return;
        }
        chunks.push(c);
      }
      const request = new Request("http://local" + url, {
        method: req.method,
        body: chunks.length ? Buffer.concat(chunks) : undefined,
      });
      const r = await handle(request);
      res.status(r.status);
      r.headers.forEach((v, k) => res.setHeader(k, v));
      res.send(Buffer.from(await r.arrayBuffer()));
    } catch (e) {
      next(e);
    }
  };
}
