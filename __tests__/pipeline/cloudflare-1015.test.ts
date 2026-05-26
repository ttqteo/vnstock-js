import axios from "axios";
import { fetchWithRetry } from "../../src/pipeline/fetch";
import { RateLimitError } from "../../src/errors";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("Cloudflare Error 1015 detection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("throws RateLimitError when response body contains 'Error 1015' with cf-ray header", async () => {
    const cfError = {
      response: {
        status: 429,
        headers: { "cf-ray": "9fb94bc1d87008a2" },
        data: "<html><body>Error 1015: You are being rate limited</body></html>",
      },
    };
    mockedAxios.request.mockRejectedValue(cfError);

    await expect(
      fetchWithRetry(
        { url: "https://api.vietcap.com.vn/test", method: "GET" },
        { retries: 0, retryDelay: 10, rateLimitWait: 0 }
      )
    ).rejects.toThrow(RateLimitError);

    await expect(
      fetchWithRetry(
        { url: "https://api.vietcap.com.vn/test", method: "GET" },
        { retries: 0, retryDelay: 10, rateLimitWait: 0 }
      )
    ).rejects.toThrow(/Cloudflare Error 1015/);
  });

  it("throws RateLimitError on HTTP 403 with cloudflare body + cf-ray", async () => {
    const cfError = {
      response: {
        status: 403,
        headers: { "cf-ray": "deadbeef" },
        data: "<html>Sorry, you have been blocked. Powered by cloudflare</html>",
      },
    };
    mockedAxios.request.mockRejectedValue(cfError);

    await expect(
      fetchWithRetry(
        { url: "https://api.vietcap.com.vn/test", method: "GET" },
        { retries: 0, retryDelay: 10, rateLimitWait: 0 }
      )
    ).rejects.toThrow(RateLimitError);
  });

  it("does NOT mistake plain 429 (no cf-ray) for Cloudflare 1015", async () => {
    const plain429 = {
      response: {
        status: 429,
        headers: {},
        data: "rate limited",
      },
    };
    mockedAxios.request.mockRejectedValue(plain429);

    await expect(
      fetchWithRetry(
        { url: "https://example.com/api", method: "GET" },
        { retries: 0, retryDelay: 10, rateLimitWait: 0 }
      )
    ).rejects.toThrow(RateLimitError);
  });

  it("does NOT classify regular 403 (no cf-ray) as RateLimitError", async () => {
    const plain403 = {
      response: {
        status: 403,
        headers: {},
        data: "forbidden",
        statusText: "Forbidden",
      },
    };
    mockedAxios.request.mockRejectedValue(plain403);

    let thrown: any;
    try {
      await fetchWithRetry(
        { url: "https://example.com/api", method: "GET" },
        { retries: 0, retryDelay: 10, rateLimitWait: 0 }
      );
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeDefined();
    expect(thrown).not.toBeInstanceOf(RateLimitError);
  });

  it("does NOT classify cf-ray + JSON body (non-1015) as Cloudflare 1015", async () => {
    const cfApi = {
      response: {
        status: 500,
        headers: { "cf-ray": "deadbeef" },
        data: { error: "Internal" },
        statusText: "Internal Server Error",
      },
    };
    mockedAxios.request.mockRejectedValue(cfApi);

    let thrown: any;
    try {
      await fetchWithRetry(
        { url: "https://api.vietcap.com.vn/test", method: "GET" },
        { retries: 0, retryDelay: 10, rateLimitWait: 0 }
      );
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeDefined();
    expect(thrown).not.toBeInstanceOf(RateLimitError);
  });

  it("retries with exponential backoff on Cloudflare 1015 (fake timers)", async () => {
    jest.useFakeTimers();
    const cfError = {
      response: {
        status: 429,
        headers: { "cf-ray": "abc123" },
        data: "Error 1015",
      },
    };
    mockedAxios.request
      .mockRejectedValueOnce(cfError)
      .mockResolvedValueOnce({ data: { ok: true } });

    const promise = fetchWithRetry(
      { url: "https://api.vietcap.com.vn/test", method: "GET" },
      { retries: 1, retryDelay: 10, rateLimitWait: 0 }
    );

    // Advance through 30s wait (first attempt -> sleep -> retry)
    await jest.advanceTimersByTimeAsync(30000);

    const result = await promise;
    expect(result).toEqual({ ok: true });
    expect(mockedAxios.request).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });
});
