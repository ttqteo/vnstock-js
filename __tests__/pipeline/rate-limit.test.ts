import axios from "axios";
import { fetchWithRetry } from "../../src/pipeline/fetch";
import { RateLimitError } from "../../src/errors";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("rate limit auto-wait", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it(
    "auto-waits on 429 with Retry-After header then retries successfully",
    async () => {
      const error429 = {
        response: {
          status: 429,
          headers: { "retry-after": "1" },
        },
      };
      mockedAxios.request
        .mockRejectedValueOnce(error429)
        .mockResolvedValueOnce({ data: { ok: true } });

      const start = Date.now();
      const result = await fetchWithRetry(
        { url: "https://example.com/api", method: "GET" },
        { retries: 2, retryDelay: 10 }
      );
      const elapsed = Date.now() - start;

      expect(result).toEqual({ ok: true });
      expect(mockedAxios.request).toHaveBeenCalledTimes(2);
      expect(elapsed).toBeGreaterThanOrEqual(900);
    },
    10000
  );

  it(
    "uses default rateLimitWait when no Retry-After header",
    async () => {
      const error429 = {
        response: {
          status: 429,
          headers: {},
        },
      };
      mockedAxios.request
        .mockRejectedValueOnce(error429)
        .mockResolvedValueOnce({ data: { ok: true } });

      const result = await fetchWithRetry(
        { url: "https://example.com/api", method: "GET" },
        { retries: 2, retryDelay: 10, rateLimitWait: 100 }
      );

      expect(result).toEqual({ ok: true });
      expect(mockedAxios.request).toHaveBeenCalledTimes(2);
    },
    10000
  );

  it(
    "throws RateLimitError when retries exhausted",
    async () => {
      const error429 = {
        response: {
          status: 429,
          headers: {},
        },
      };
      mockedAxios.request
        .mockRejectedValueOnce(error429)
        .mockRejectedValueOnce(error429)
        .mockRejectedValueOnce(error429);

      await expect(
        fetchWithRetry(
          { url: "https://example.com/api", method: "GET" },
          { retries: 2, retryDelay: 10, rateLimitWait: 10 }
        )
      ).rejects.toThrow(RateLimitError);

      expect(mockedAxios.request).toHaveBeenCalledTimes(3);
    },
    10000
  );

  it(
    "skips auto-wait when rateLimitWait is 0",
    async () => {
      const error429 = {
        response: {
          status: 429,
          headers: { "retry-after": "1" },
        },
      };
      mockedAxios.request.mockRejectedValueOnce(error429);

      await expect(
        fetchWithRetry(
          { url: "https://example.com/api", method: "GET" },
          { retries: 2, retryDelay: 10, rateLimitWait: 0 }
        )
      ).rejects.toThrow(RateLimitError);

      expect(mockedAxios.request).toHaveBeenCalledTimes(1);
    },
    10000
  );
});
