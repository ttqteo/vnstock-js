import { NetworkError, RateLimitError } from "../../src/errors";

/**
 * Integration tests talk to a third party we do not control. A slow, rate
 * limited or briefly unreachable endpoint is not a defect in this library,
 * so it should not turn CI red: log it and let the test pass.
 *
 * Only transport-level failures are tolerated. A shape change still fails,
 * which is the whole point of running these.
 *
 *   it("...", async () => {
 *     const data = await tolerateUpstream(() => api.call());
 *     if (!data) return;
 *     expect(data.length).toBeGreaterThan(0);
 *   });
 */
export async function tolerateUpstream<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (e: any) {
    const flaky =
      e instanceof NetworkError ||
      e instanceof RateLimitError ||
      (e && (e.code === "ECONNABORTED" || e.code === "ETIMEDOUT" || e.code === "ECONNRESET"));
    if (!flaky) throw e;
    console.warn(`[integration] bỏ qua vì upstream không phản hồi được: ${e.message}`);
    return null;
  }
}
