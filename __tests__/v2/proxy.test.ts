import { createProxyHandler, expressHandler, nextHandler, workerHandler } from "../../src/proxy";
import { resetSession } from "../../src/shared/session";

function upstream(captured: any[]) {
  return (async (url: any, init: any) => {
    captured.push({ url: String(url), init });
    return new Response('{"ok":true}', { status: 200, headers: { "content-type": "application/json", "set-cookie": "a=b" } });
  }) as any;
}

const BASE = "https://site.test/api/vnstock";

beforeEach(() => resetSession());

describe("proxy", () => {
  it("forwards allowed paths with Vietcap session headers", async () => {
    const seen: any[] = [];
    const handle = createProxyHandler({ basePath: "/api/vnstock", fetch: upstream(seen) });
    const res = await handle(
      new Request(BASE + "/vci-trading/api/price/symbols/getList", {
        method: "POST",
        body: '{"symbols":["FPT"]}',
        headers: { "content-type": "application/json" },
      })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(seen[0].url).toBe("https://trading.vietcap.com.vn/api/price/symbols/getList");
    expect(seen[0].init.method).toBe("POST");
    expect(seen[0].init.headers.Origin).toBe("https://trading.vietcap.com.vn");
    expect(seen[0].init.headers["Device-Id"]).toMatch(/^[0-9a-f]{16}$/);
    expect(seen[0].init.body).toBe('{"symbols":["FPT"]}');
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("keeps upstream cookies server-side for the next request", async () => {
    const seen: any[] = [];
    const handle = createProxyHandler({ basePath: "/api/vnstock", fetch: upstream(seen) });
    await handle(new Request(BASE + "/vci-trading/api/chart/OHLCChart/gap-chart", { method: "POST", body: "{}" }));
    await handle(new Request(BASE + "/vci-trading/api/chart/OHLCChart/gap-chart", { method: "POST", body: "{}" }));
    expect(seen[1].init.headers.Cookie).toContain("a=b");
  });

  it("keeps the query string", async () => {
    const seen: any[] = [];
    const handle = createProxyHandler({ basePath: "/api/vnstock", fetch: upstream(seen) });
    await handle(new Request(BASE + "/vci-iq/api/iq-insight-service/v1/events?ticker=FPT&page=0"));
    expect(seen[0].url).toBe("https://iq.vietcap.com.vn/api/iq-insight-service/v1/events?ticker=FPT&page=0");
    expect(seen[0].init.body).toBeUndefined();
  });

  it("refuses unknown upstreams and paths outside the allowlist", async () => {
    const seen: any[] = [];
    const handle = createProxyHandler({ basePath: "/api/vnstock", fetch: upstream(seen) });
    for (const path of [
      "/evil/x",
      "/vci-ai/api/x",
      "/vci-trading/admin",
      "/vci-trading/data-mt/graphql",
      "/vci-iq/api/other-service/x",
      "/vci-trading/api/../../etc",
      "/vci-trading/api/price/%2e%2e/%2e%2e/admin",
      "/vci-trading",
      "/https://evil.test/api/chart/x",
    ]) {
      expect([path, (await handle(new Request(BASE + path))).status]).toEqual([path, 403]);
    }
    expect((await handle(new Request("https://site.test/other"))).status).toBe(404);
    expect(seen).toHaveLength(0);
  });

  it("refuses methods other than GET, HEAD and POST", async () => {
    const handle = createProxyHandler({ basePath: "/api/vnstock", fetch: upstream([]) });
    const res = await handle(new Request(BASE + "/vci-trading/api/price/x", { method: "DELETE" }));
    expect(res.status).toBe(405);
  });

  it("answers 502 when the upstream cannot be reached", async () => {
    const handle = createProxyHandler({
      basePath: "/api/vnstock",
      fetch: (async () => {
        throw new TypeError("fetch failed");
      }) as any,
    });
    const res = await handle(new Request(BASE + "/vci-iq/api/iq-insight-service/v1/company/FPT"));
    expect(res.status).toBe(502);
  });

  it("passes upstream errors through without caching them", async () => {
    const handle = createProxyHandler({ basePath: "/api/vnstock", fetch: (async () => new Response("down", { status: 503 })) as any });
    const res = await handle(new Request(BASE + "/vci-iq/api/iq-insight-service/v1/company/FPT"));
    expect(res.status).toBe(503);
    expect(res.headers.get("cache-control")).toBeNull();
  });

  it("sets a short CDN cache on GETs only", async () => {
    const handle = createProxyHandler({ basePath: "/api/vnstock", fetch: upstream([]) });
    const get = await handle(new Request(BASE + "/vci-iq/api/iq-insight-service/v1/company/FPT"));
    expect(get.headers.get("cache-control")).toBe("public, s-maxage=30, stale-while-revalidate=60");
    const post = await handle(new Request(BASE + "/vci-trading/api/price/symbols/getList", { method: "POST", body: "{}" }));
    expect(post.headers.get("cache-control")).toBeNull();
    const off = createProxyHandler({ basePath: "/api/vnstock", cacheSeconds: 0, fetch: upstream([]) });
    expect((await off(new Request(BASE + "/vci-iq/api/iq-insight-service/v1/company/FPT"))).headers.get("cache-control")).toBeNull();
  });

  it("stops upstream content from running as a page on the proxy's origin", async () => {
    const handle = createProxyHandler({
      basePath: "/api/vnstock",
      fetch: (async () => new Response("<script>alert(1)</script>", { status: 403, headers: { "content-type": "text/html" } })) as any,
    });
    const res = await handle(new Request(BASE + "/vci-trading/api/price/x"));
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("content-security-policy")).toBe("default-src 'none'; sandbox");
  });

  it("refuses bodies over maxBodyBytes before calling upstream", async () => {
    const seen: any[] = [];
    const handle = createProxyHandler({ basePath: "/api/vnstock", maxBodyBytes: 10, fetch: upstream(seen) });
    const url = BASE + "/vci-trading/api/price/symbols/getList";
    expect((await handle(new Request(url, { method: "POST", body: "x".repeat(11) }))).status).toBe(413);
    const declared = new Request(url, { method: "POST", body: "{}", headers: { "content-length": "999" } });
    expect((await handle(declared)).status).toBe(413);
    expect((await handle(new Request(url, { method: "POST", body: "x".repeat(10) }))).status).toBe(200);
    expect(seen).toHaveLength(1);
  });

  it("stops reading an Express body once it passes maxBodyBytes", async () => {
    const seen: any[] = [];
    const mw = expressHandler({ maxBodyBytes: 10, fetch: upstream(seen) });
    const sent: any = { headers: {} };
    const res = {
      status: (s: number) => (sent.status = s),
      setHeader: (k: string, v: string) => (sent.headers[k] = v),
      send: (b: Buffer) => (sent.body = b.toString()),
    };
    let pulled = 0;
    const req: any = {
      method: "POST",
      originalUrl: "/api/vnstock/vci-trading/api/price/symbols/getList",
      async *[Symbol.asyncIterator]() {
        for (let i = 0; i < 100; i++) {
          pulled++;
          yield Buffer.from("xxxxxx");
        }
      },
    };
    await mw(req, res, jest.fn());
    expect(sent.status).toBe(413);
    expect(pulled).toBe(2);
    expect(seen).toHaveLength(0);
  });

  it("offers an Express middleware that forwards the body and skips other paths", async () => {
    const seen: any[] = [];
    const mw = expressHandler({ fetch: upstream(seen) });
    const sent: any = { headers: {} };
    const res = {
      status: (s: number) => (sent.status = s),
      setHeader: (k: string, v: string) => (sent.headers[k] = v),
      send: (b: Buffer) => (sent.body = b.toString()),
    };
    const req: any = {
      method: "POST",
      originalUrl: "/api/vnstock/vci-trading/api/price/symbols/getList",
      async *[Symbol.asyncIterator]() {
        yield Buffer.from('{"symbols":["FPT"]}');
      },
    };
    const next = jest.fn();
    await mw(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(sent.status).toBe(200);
    expect(sent.body).toBe('{"ok":true}');
    expect(seen[0].init.body).toBe('{"symbols":["FPT"]}');
    await mw({ method: "GET", url: "/health" }, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("offers Next.js and worker adapters mounted at /api/vnstock", async () => {
    const seen: any[] = [];
    const { GET, POST } = nextHandler({ fetch: upstream(seen) });
    expect(typeof POST).toBe("function");
    await GET(new Request(BASE + "/vci-iq/api/iq-insight-service/v1/company/FPT"));
    const worker = workerHandler({ fetch: upstream(seen) });
    await worker(new Request(BASE + "/vci-trading/api/chart/OHLCChart/gap-chart"));
    expect(seen.map((s) => s.url)).toEqual([
      "https://iq.vietcap.com.vn/api/iq-insight-service/v1/company/FPT",
      "https://trading.vietcap.com.vn/api/chart/OHLCChart/gap-chart",
    ]);
  });
});
