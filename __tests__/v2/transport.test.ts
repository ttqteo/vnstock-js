import { createTransport, PROXY_ROUTES } from "../../src/transport";
import { ApiError, NetworkError, RateLimitError } from "../../src/errors";
import { resetSession, setCookiesFromHeaders, getCookieHeader } from "../../src/shared/session";

function res(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return new Response(text, { status, headers: { "content-type": "application/json", ...headers } });
}

function recorder(responses: Array<Response | Error | (() => Response | Promise<Response>)>) {
  const calls: Array<{ url: string; init: any }> = [];
  let i = 0;
  const fetch = async (url: any, init: any) => {
    calls.push({ url: String(url), init });
    const r = responses[Math.min(i++, responses.length - 1)];
    if (r instanceof Error) throw r;
    return typeof r === "function" ? r() : r.clone();
  };
  return { calls, fetch: fetch as any };
}

function bodyAbortedAfterHeaders(): Response {
  return { ok: true, status: 200, statusText: "OK", headers: new Headers(), text: async () => Promise.reject(new Error("aborted")) } as any;
}

beforeEach(() => resetSession());

describe("transport basics (from pipeline/fetch)", () => {
  it("makes a GET request and returns parsed JSON", async () => {
    const r = recorder([res(200, { ok: 1 })]);
    const data = await createTransport({ fetch: r.fetch }).request({ url: "https://example.com/api", method: "GET" });
    expect(data).toEqual({ ok: 1 });
    expect(r.calls[0].init.method).toBe("GET");
    expect(r.calls[0].init.body).toBeUndefined();
  });

  it("makes a POST request with a JSON body", async () => {
    const r = recorder([res(200, { ok: 1 })]);
    await createTransport({ fetch: r.fetch }).request({ url: "https://trading.vietcap.com.vn/api/x", method: "POST", data: { a: 1 } });
    expect(r.calls[0].init.method).toBe("POST");
    expect(r.calls[0].init.body).toBe('{"a":1}');
    expect(r.calls[0].init.headers["Content-Type"]).toBe("application/json");
  });

  it("returns text bodies that are not JSON, and null for empty bodies", async () => {
    const t = createTransport({ fetch: recorder([res(200, "plain"), res(200, "")]).fetch });
    expect(await t.request({ url: "https://example.com/a", method: "GET" })).toBe("plain");
    expect(await t.request({ url: "https://example.com/a", method: "GET" })).toBeNull();
  });

  it("appends query params and skips empty ones", async () => {
    const r = recorder([res(200, []), res(200, [])]);
    const t = createTransport({ fetch: r.fetch });
    await t.request({ url: "https://iq.vietcap.com.vn/api/a", method: "GET", params: { ticker: "FPT", page: 0, skip: undefined, none: null } });
    await t.request({ url: "https://iq.vietcap.com.vn/api/a?x=1", method: "GET", params: { q: "a b" } });
    expect(r.calls[0].url).toBe("https://iq.vietcap.com.vn/api/a?ticker=FPT&page=0");
    expect(r.calls[1].url).toBe("https://iq.vietcap.com.vn/api/a?x=1&q=a%20b");
  });

  it("sends Vietcap session headers for vietcap.com.vn URLs", async () => {
    const r = recorder([res(200, {})]);
    await createTransport({ fetch: r.fetch }).request({ url: "https://trading.vietcap.com.vn/api/test", method: "GET" });
    const h = r.calls[0].init.headers;
    expect(h["Device-Id"]).toMatch(/^[0-9a-f]{16}$/);
    expect(h.Origin).toBe("https://trading.vietcap.com.vn");
    expect(h.Referer).toEqual(expect.any(String));
    expect(h.Cookie).toContain("device_id=");
    expect(h["User-Agent"]).toEqual(expect.any(String));
  });

  it("uses minimal headers for other URLs (no Origin/Referer to avoid 403)", async () => {
    const r = recorder([res(200, {})]);
    await createTransport({ fetch: r.fetch }).request({ url: "https://example.com/api", method: "GET" });
    const h = r.calls[0].init.headers;
    expect(h).toHaveProperty("User-Agent");
    expect(h).toHaveProperty("Accept");
    expect(h).not.toHaveProperty("Origin");
    expect(h).not.toHaveProperty("Referer");
    expect(h).not.toHaveProperty("Device-Id");
  });

  it("lets caller headers override the defaults", async () => {
    const r = recorder([res(200, {})]);
    await createTransport({ fetch: r.fetch }).request({
      url: "https://trading.vietcap.com.vn/api/test",
      method: "GET",
      headers: { Referer: "https://x.test/" },
    });
    expect(r.calls[0].init.headers.Referer).toBe("https://x.test/");
  });

  it("keeps cookies set by Vietcap for the next request", async () => {
    const r = recorder([res(200, {}, { "set-cookie": "sid=abc; Path=/" }), res(200, {})]);
    const t = createTransport({ fetch: r.fetch });
    await t.request({ url: "https://trading.vietcap.com.vn/api/a", method: "GET" });
    await t.request({ url: "https://trading.vietcap.com.vn/api/b", method: "GET" });
    expect(r.calls[1].init.headers.Cookie).toContain("sid=abc");
  });
});

describe("proxy rewriting", () => {
  it("rewrites Vietcap URLs through the proxy and sends no session headers", async () => {
    const r = recorder([res(200, {}), res(200, {})]);
    const t = createTransport({ proxy: "/api/vnstock/", fetch: r.fetch });
    await t.request({ url: "https://iq.vietcap.com.vn/api/iq-insight-service/v1/company/FPT", method: "GET" });
    await t.request({ url: "https://trading.vietcap.com.vn/api/chart/OHLCChart/gap-chart", method: "POST", data: {} });
    expect(r.calls[0].url).toBe("/api/vnstock/vci-iq/api/iq-insight-service/v1/company/FPT");
    expect(r.calls[1].url).toBe("/api/vnstock/vci-trading/api/chart/OHLCChart/gap-chart");
    for (const c of r.calls) {
      expect(c.init.headers["Device-Id"]).toBeUndefined();
      expect(c.init.headers.Origin).toBeUndefined();
      expect(c.init.headers.Cookie).toBeUndefined();
    }
  });

  it("leaves hosts outside the proxy routes alone", async () => {
    const r = recorder([res(200, {})]);
    await createTransport({ proxy: "/api/vnstock", fetch: r.fetch }).request({ url: "https://ai.vietcap.com.vn/api/x", method: "GET" });
    expect(r.calls[0].url).toBe("https://ai.vietcap.com.vn/api/x");
  });

  it("routes exactly the two Vietcap hosts", () => {
    expect(PROXY_ROUTES).toEqual({ "vci-trading": "https://trading.vietcap.com.vn", "vci-iq": "https://iq.vietcap.com.vn" });
  });
});

describe("retries and error mapping (from pipeline/fetch, pipeline/errors)", () => {
  it("retries 5xx then succeeds", async () => {
    const r = recorder([res(500, "x"), res(200, { ok: true })]);
    expect(await createTransport({ retries: 2, retryDelay: 1, fetch: r.fetch }).request({ url: "https://x.test/a", method: "GET" })).toEqual({ ok: true });
    expect(r.calls).toHaveLength(2);
  });

  it("retries 5xx then throws ApiError with status when retries run out", async () => {
    const r = recorder([res(503, "down")]);
    await expect(createTransport({ retries: 2, retryDelay: 1, fetch: r.fetch }).request({ url: "https://x.test/a", method: "GET" })).rejects.toMatchObject({
      name: "ApiError",
      statusCode: 503,
    });
    expect(r.calls).toHaveLength(3);
  });

  it("does not retry 4xx and maps 404 to ApiError", async () => {
    const r = recorder([res(404, "nope")]);
    const err: any = await createTransport({ retries: 2, retryDelay: 1, fetch: r.fetch })
      .request({ url: "https://x.test/a", method: "GET" })
      .catch((e: any) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.statusCode).toBe(404);
    expect(r.calls).toHaveLength(1);
  });

  it("maps a timeout to NetworkError and retries it", async () => {
    let n = 0;
    const hang = async (_url: any, init: any) => {
      n++;
      return new Promise<Response>((_, reject) => init.signal.addEventListener("abort", () => reject(init.signal.reason)));
    };
    const err: any = await createTransport({ timeout: 20, retries: 1, retryDelay: 1, fetch: hang as any })
      .request({ url: "https://x.test/a", method: "GET" })
      .catch((e: any) => e);
    expect(err).toBeInstanceOf(NetworkError);
    expect(err.message).toBe("Request timed out after 20ms");
    expect(n).toBe(2);
  });

  it("retries a timeout and succeeds", async () => {
    const timeout = Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" });
    const r = recorder([timeout, res(200, { ok: 1 })]);
    expect(await createTransport({ retries: 1, retryDelay: 1, fetch: r.fetch }).request({ url: "https://x.test/a", method: "GET" })).toEqual({ ok: 1 });
  });

  it("maps a DNS failure to NetworkError", async () => {
    const dns = Object.assign(new TypeError("fetch failed"), { cause: { code: "ENOTFOUND" } });
    const err: any = await createTransport({ retries: 0, fetch: recorder([dns]).fetch })
      .request({ url: "https://x.test/a", method: "GET" })
      .catch((e: any) => e);
    expect(err).toBeInstanceOf(NetworkError);
    expect(err).not.toBeInstanceOf(RateLimitError);
  });
});

describe("aborted responses (from pipeline/aborted)", () => {
  it("reports a body that dies after the 200 headers as NetworkError, not HTTP 200", async () => {
    const err: any = await createTransport({ retries: 0, fetch: recorder([bodyAbortedAfterHeaders]).fetch })
      .request({ url: "https://x.test/a", method: "GET" })
      .catch((e: any) => e);
    expect(err).toBeInstanceOf(NetworkError);
    expect(err.message).not.toMatch(/HTTP 200/);
  });

  it("retries an aborted download", async () => {
    const r = recorder([bodyAbortedAfterHeaders, res(200, { ok: 1 })]);
    expect(await createTransport({ retries: 1, retryDelay: 1, fetch: r.fetch }).request({ url: "https://x.test/a", method: "GET" })).toEqual({ ok: 1 });
    expect(r.calls).toHaveLength(2);
  });

  it("keeps reporting real HTTP errors as ApiError", async () => {
    const err: any = await createTransport({ retries: 0, fetch: recorder([res(502, "bad gateway")]).fetch })
      .request({ url: "https://x.test/a", method: "GET" })
      .catch((e: any) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).not.toBeInstanceOf(NetworkError);
  });
});

describe("rate limits (from pipeline/rate-limit, pipeline/errors)", () => {
  it("waits for Retry-After (capped by rateLimitWait) on 429 then retries", async () => {
    const r = recorder([res(429, "slow", { "retry-after": "1" }), res(200, { ok: true })]);
    const start = Date.now();
    const data = await createTransport({ retries: 2, retryDelay: 1, rateLimitWait: 60, fetch: r.fetch }).request({ url: "https://x.test/a", method: "GET" });
    expect(data).toEqual({ ok: true });
    expect(r.calls).toHaveLength(2);
    expect(Date.now() - start).toBeGreaterThanOrEqual(50);
  });

  it("waits rateLimitWait when there is no Retry-After", async () => {
    const r = recorder([res(429, "slow"), res(200, { ok: true })]);
    const start = Date.now();
    await createTransport({ retries: 1, retryDelay: 1, rateLimitWait: 60, fetch: r.fetch }).request({ url: "https://x.test/a", method: "GET" });
    expect(Date.now() - start).toBeGreaterThanOrEqual(50);
  });

  it("throws RateLimitError when retries are exhausted", async () => {
    const r = recorder([res(429, "slow")]);
    await expect(
      createTransport({ retries: 2, retryDelay: 1, rateLimitWait: 1, fetch: r.fetch }).request({ url: "https://x.test/a", method: "GET" })
    ).rejects.toBeInstanceOf(RateLimitError);
    expect(r.calls).toHaveLength(3);
  });

  it("skips the wait and throws at once when rateLimitWait is 0", async () => {
    const r = recorder([res(429, "slow", { "retry-after": "1" })]);
    await expect(
      createTransport({ retries: 2, retryDelay: 1, rateLimitWait: 0, fetch: r.fetch }).request({ url: "https://x.test/a", method: "GET" })
    ).rejects.toBeInstanceOf(RateLimitError);
    expect(r.calls).toHaveLength(1);
  });
});

describe("Cloudflare 1015 (from pipeline/cloudflare-1015)", () => {
  const once = (r: ReturnType<typeof recorder>) =>
    createTransport({ retries: 0, fetch: r.fetch })
      .request({ url: "https://x.test/a", method: "GET" })
      .catch((e: any) => e);

  it("throws RateLimitError when the body says Error 1015 with a cf-ray header", async () => {
    const err: any = await once(recorder([res(429, "<html>Error 1015</html>", { "cf-ray": "abc" })]));
    expect(err).toBeInstanceOf(RateLimitError);
    expect(err.message).toBe("Cloudflare Error 1015 (rate limited)");
  });

  it("throws RateLimitError on 403 with a cloudflare body and cf-ray", async () => {
    expect(await once(recorder([res(403, "<html>blocked by cloudflare</html>", { "cf-ray": "abc" })]))).toBeInstanceOf(RateLimitError);
  });

  it("does not mistake a plain 429 without cf-ray for Cloudflare", async () => {
    const err: any = await once(recorder([res(429, "Error 1015")]));
    expect(err).toBeInstanceOf(RateLimitError);
    expect(err.message).toBe("Rate limit exceeded (HTTP 429)");
  });

  it("does not classify a regular 403 without cf-ray as a rate limit", async () => {
    const err: any = await once(recorder([res(403, "<html>cloudflare</html>")]));
    expect(err).toBeInstanceOf(ApiError);
    expect(err.statusCode).toBe(403);
  });

  it("does not classify cf-ray with a JSON error body as Cloudflare", async () => {
    const err: any = await once(recorder([res(403, { error: "forbidden" }, { "cf-ray": "abc" })]));
    expect(err).toBeInstanceOf(ApiError);
  });

  it("backs off 30s then retries on Cloudflare 1015", async () => {
    jest.useFakeTimers();
    try {
      const r = recorder([res(429, "Error 1015", { "cf-ray": "abc" }), res(200, { ok: true })]);
      const p = createTransport({ retries: 1, retryDelay: 10, rateLimitWait: 0, fetch: r.fetch }).request({
        url: "https://api.vietcap.com.vn/test",
        method: "GET",
      });
      await jest.advanceTimersByTimeAsync(29000);
      expect(r.calls).toHaveLength(1);
      await jest.advanceTimersByTimeAsync(1000);
      expect(await p).toEqual({ ok: true });
      expect(r.calls).toHaveLength(2);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe("serializable errors (from pipeline/fetch)", () => {
  it("produces network errors that JSON.stringify cleanly with diagnostic fields", async () => {
    const boom = Object.assign(new TypeError("fetch failed"), { code: "ECONNRESET" });
    const err: any = await createTransport({ retries: 0, fetch: recorder([boom]).fetch })
      .request({ url: "https://example.com/api", method: "GET" })
      .catch((e: any) => e);
    expect(() => JSON.stringify(err)).not.toThrow();
    expect(() => JSON.stringify(err.cause)).not.toThrow();
    expect(err.cause.message).toBe("fetch failed");
    expect(err.cause.code).toBe("ECONNRESET");
    expect(err.cause.url).toBe("https://example.com/api");
    expect(err.cause.method).toBe("GET");
  });

  it("produces HTTP errors that JSON.stringify cleanly and carry the status", async () => {
    const err: any = await createTransport({ retries: 0, fetch: recorder([res(503, "")]).fetch })
      .request({ url: "https://x.test/a", method: "GET" })
      .catch((e: any) => e);
    expect(() => JSON.stringify(err)).not.toThrow();
    expect(err.cause.status).toBe(503);
  });
});

describe("setCookiesFromHeaders", () => {
  it("reads a combined set-cookie header when getSetCookie is missing", () => {
    const headers = { get: (k: string) => (k === "set-cookie" ? "a=1; Path=/, b=2; Expires=Wed, 21 Oct 2026 07:28:00 GMT" : null) } as any;
    setCookiesFromHeaders("https://trading.vietcap.com.vn/api", headers);
    const cookie = getCookieHeader("https://trading.vietcap.com.vn/x");
    expect(cookie).toContain("a=1");
    expect(cookie).toContain("b=2");
  });
});
