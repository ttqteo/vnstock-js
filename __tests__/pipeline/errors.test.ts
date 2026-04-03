import axios from "axios";
import { fetchWithRetry } from "../../src/pipeline/fetch";
import { NetworkError, RateLimitError, ApiError } from "../../src/errors";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

const baseConfig = { url: "https://example.com/api", method: "GET" as const };

describe("fetchWithRetry error wrapping", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("wraps timeout to NetworkError", async () => {
    mockedAxios.request.mockRejectedValue({
      code: "ECONNABORTED",
      message: "timeout of 15000ms exceeded",
    });

    await expect(
      fetchWithRetry(baseConfig, { retries: 0 })
    ).rejects.toThrow(NetworkError);
  });

  it("wraps DNS failure to NetworkError", async () => {
    mockedAxios.request.mockRejectedValue({
      code: "ENOTFOUND",
      message: "getaddrinfo ENOTFOUND example.com",
    });

    await expect(
      fetchWithRetry(baseConfig, { retries: 0 })
    ).rejects.toThrow(NetworkError);
  });

  it("wraps HTTP 429 to RateLimitError", async () => {
    mockedAxios.request.mockRejectedValue({
      response: { status: 429, statusText: "Too Many Requests" },
    });

    await expect(
      fetchWithRetry(baseConfig, { retries: 0 })
    ).rejects.toThrow(RateLimitError);
  });

  it("wraps HTTP 500 to ApiError", async () => {
    mockedAxios.request.mockRejectedValue({
      response: { status: 500, statusText: "Internal Server Error" },
      code: undefined,
    });

    await expect(
      fetchWithRetry(baseConfig, { retries: 0 })
    ).rejects.toThrow(ApiError);

    try {
      await fetchWithRetry(baseConfig, { retries: 0 });
    } catch (e: any) {
      expect(e).toBeInstanceOf(ApiError);
      expect(e.statusCode).toBe(500);
    }
  });

  it("wraps HTTP 404 to ApiError", async () => {
    mockedAxios.request.mockRejectedValue({
      response: { status: 404, statusText: "Not Found" },
    });

    await expect(
      fetchWithRetry(baseConfig, { retries: 0 })
    ).rejects.toThrow(ApiError);

    try {
      await fetchWithRetry(baseConfig, { retries: 0 });
    } catch (e: any) {
      expect(e.statusCode).toBe(404);
    }
  });

  it("retries on 500 then succeeds", async () => {
    mockedAxios.request
      .mockRejectedValueOnce({
        response: { status: 500, statusText: "Internal Server Error" },
      })
      .mockResolvedValueOnce({ data: { ok: true } });

    const result = await fetchWithRetry(baseConfig, {
      retries: 1,
      retryDelay: 1,
    });
    expect(result).toEqual({ ok: true });
    expect(mockedAxios.request).toHaveBeenCalledTimes(2);
  });
});
