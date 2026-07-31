import axios from "axios";
import { fetchWithRetry } from "../../src/pipeline/fetch";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("fetchWithRetry", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("makes a GET request and returns data", async () => {
    mockedAxios.request.mockResolvedValueOnce({ data: { result: "ok" } });

    const result = await fetchWithRetry({
      url: "https://example.com/api",
      method: "GET",
    });

    expect(result).toEqual({ result: "ok" });
    expect(mockedAxios.request).toHaveBeenCalledTimes(1);
  });

  it("makes a POST request with data", async () => {
    mockedAxios.request.mockResolvedValueOnce({ data: [1, 2, 3] });

    const result = await fetchWithRetry({
      url: "https://example.com/api",
      method: "POST",
      data: { symbols: ["VCI"] },
    });

    expect(result).toEqual([1, 2, 3]);
    expect(mockedAxios.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "POST",
        data: { symbols: ["VCI"] },
      })
    );
  });

  it("retries on 5xx error and succeeds", async () => {
    const error5xx = { response: { status: 500 } };
    mockedAxios.request
      .mockRejectedValueOnce(error5xx)
      .mockResolvedValueOnce({ data: { ok: true } });

    const result = await fetchWithRetry(
      { url: "https://example.com/api", method: "GET" },
      { retries: 2, retryDelay: 10 }
    );

    expect(result).toEqual({ ok: true });
    expect(mockedAxios.request).toHaveBeenCalledTimes(2);
  });

  it("retries on timeout and succeeds", async () => {
    const timeoutError = { code: "ECONNABORTED" };
    mockedAxios.request
      .mockRejectedValueOnce(timeoutError)
      .mockResolvedValueOnce({ data: { ok: true } });

    const result = await fetchWithRetry(
      { url: "https://example.com/api", method: "GET" },
      { retries: 2, retryDelay: 10 }
    );

    expect(result).toEqual({ ok: true });
    expect(mockedAxios.request).toHaveBeenCalledTimes(2);
  });

  it("throws after all retries exhausted", async () => {
    const error5xx = { response: { status: 503 } };
    mockedAxios.request
      .mockRejectedValueOnce(error5xx)
      .mockRejectedValueOnce(error5xx)
      .mockRejectedValueOnce(error5xx);

    await expect(
      fetchWithRetry(
        { url: "https://example.com/api", method: "GET" },
        { retries: 2, retryDelay: 10 }
      )
    ).rejects.toThrow(/503/);

    expect(mockedAxios.request).toHaveBeenCalledTimes(3);
  });

  it("does not retry on 4xx errors", async () => {
    const error4xx = { response: { status: 404 } };
    mockedAxios.request.mockRejectedValueOnce(error4xx);

    await expect(
      fetchWithRetry(
        { url: "https://example.com/api", method: "GET" },
        { retries: 2, retryDelay: 10 }
      )
    ).rejects.toThrow(/404/);

    expect(mockedAxios.request).toHaveBeenCalledTimes(1);
  });

  it("includes Vietcap-specific headers for vietcap.com.vn URLs", async () => {
    mockedAxios.request.mockResolvedValueOnce({ data: {}, headers: {} });

    await fetchWithRetry({ url: "https://trading.vietcap.com.vn/api/test", method: "GET" });

    expect(mockedAxios.request).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          Referer: expect.any(String),
          Origin: expect.any(String),
          "Device-Id": expect.any(String),
          Cookie: expect.stringContaining("device_id="),
        }),
      })
    );
  });

  it("uses minimal headers for non-Vietcap URLs (no Origin/Referer to avoid 403)", async () => {
    mockedAxios.request.mockResolvedValueOnce({ data: {}, headers: {} });

    await fetchWithRetry({ url: "https://example.com/api", method: "GET" });

    const call = mockedAxios.request.mock.calls[0][0];
    expect(call.headers).toHaveProperty("User-Agent");
    expect(call.headers).toHaveProperty("Accept");
    expect(call.headers).not.toHaveProperty("Origin");
    expect(call.headers).not.toHaveProperty("Referer");
    expect(call.headers).not.toHaveProperty("Device-Id");
  });

  describe("thrown errors stay serializable", () => {
    // Axios errors carry a live socket whose _httpMessage points back at it.
    // Retaining one as `cause` breaks JSON.stringify, structured loggers, and
    // any worker IPC boundary, which is how this first surfaced: jest workers
    // crashed reporting results instead of showing the real upstream failure.
    function axiosErrorWithCircularSocket(overrides: Record<string, unknown> = {}) {
      const socket: Record<string, unknown> = {};
      const httpMessage: Record<string, unknown> = { socket };
      socket._httpMessage = httpMessage;

      return Object.assign(
        new Error("connect ETIMEDOUT"),
        {
          isAxiosError: true,
          code: "ETIMEDOUT",
          config: { url: "https://example.com/api", method: "get" },
          request: { socket },
        },
        overrides
      );
    }

    function failingFetch(): Promise<any> {
      return fetchWithRetry(
        { url: "https://example.com/api", method: "GET" },
        { retries: 0, retryDelay: 0 }
      ).catch((e) => e);
    }

    it("strips the circular request off a network error", async () => {
      mockedAxios.request.mockRejectedValue(axiosErrorWithCircularSocket());

      const err = await failingFetch();

      expect(() => JSON.stringify(err)).not.toThrow();
      expect(() => JSON.stringify(err.cause)).not.toThrow();
      expect(err.cause).not.toHaveProperty("request");
    });

    it("keeps the diagnostic fields worth debugging", async () => {
      mockedAxios.request.mockRejectedValue(axiosErrorWithCircularSocket());

      const err = await failingFetch();

      expect(err.cause.message).toBe("connect ETIMEDOUT");
      expect(err.cause.code).toBe("ETIMEDOUT");
      expect(err.cause.url).toBe("https://example.com/api");
      expect(err.cause.method).toBe("get");
    });

    it("strips the circular request off an HTTP error response", async () => {
      mockedAxios.request.mockRejectedValue(
        axiosErrorWithCircularSocket({
          response: { status: 503, statusText: "Service Unavailable", headers: {}, data: "" },
        })
      );

      const err = await failingFetch();

      expect(() => JSON.stringify(err)).not.toThrow();
      expect(err.cause.status).toBe(503);
      expect(err.cause).not.toHaveProperty("request");
    });
  });
});
