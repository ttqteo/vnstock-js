import axios from "axios";
import { fetchWithRetry } from "../../src/pipeline/fetch";
import { ApiError, NetworkError } from "../../src/errors";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

/**
 * A big response can abort mid-stream after the 200 headers already
 * arrived. Axios then reports an error that still carries a 200 response,
 * which used to surface as "ApiError: HTTP 200: OK" and was never retried.
 */
function abortedAfterHeaders(): any {
  const err: any = new Error("aborted");
  err.isAxiosError = true;
  err.code = "ECONNRESET";
  err.config = { url: "https://example.com/api", method: "GET" };
  err.request = {};
  err.response = { status: 200, statusText: "OK", headers: {}, data: undefined };
  return err;
}

describe("aborted responses", () => {
  beforeEach(() => jest.clearAllMocks());

  it("reports a transport failure instead of HTTP 200", async () => {
    mockedAxios.request.mockRejectedValue(abortedAfterHeaders());

    const err: any = await fetchWithRetry(
      { url: "https://example.com/api", method: "GET" },
      { retries: 0 }
    ).catch((e: any) => e);

    expect(err).toBeInstanceOf(NetworkError);
    expect(err).not.toBeInstanceOf(ApiError);
    expect(err.message).not.toContain("HTTP 200");
  });

  it("retries an aborted download", async () => {
    mockedAxios.request
      .mockRejectedValueOnce(abortedAfterHeaders())
      .mockResolvedValueOnce({ data: { result: "ok" } });

    const result = await fetchWithRetry(
      { url: "https://example.com/api", method: "GET" },
      { retries: 1, retryDelay: 1 }
    );

    expect(result).toEqual({ result: "ok" });
    expect(mockedAxios.request).toHaveBeenCalledTimes(2);
  });

  it("keeps reporting real HTTP errors as ApiError", async () => {
    const err: any = new Error("Request failed with status code 404");
    err.isAxiosError = true;
    err.config = { url: "https://example.com/api", method: "GET" };
    err.response = { status: 404, statusText: "Not Found", headers: {}, data: "" };
    mockedAxios.request.mockRejectedValue(err);

    const thrown: any = await fetchWithRetry(
      { url: "https://example.com/api", method: "GET" },
      { retries: 0 }
    ).catch((e: any) => e);

    expect(thrown).toBeInstanceOf(ApiError);
    expect(thrown.message).toContain("HTTP 404");
  });
});
