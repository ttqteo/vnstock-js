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

  it("includes default headers with Referer", async () => {
    mockedAxios.request.mockResolvedValueOnce({ data: {} });

    await fetchWithRetry({ url: "https://example.com/api", method: "GET" });

    expect(mockedAxios.request).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          Referer: expect.any(String),
        }),
      })
    );
  });
});
