import { fetchJson } from "../src/data/fetch";
import { NetworkError, ApiError } from "../src/errors";

// Mock axios module
jest.mock("axios");
import axios from "axios";
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("fetchJson", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns parsed data on 200", async () => {
    mockedAxios.get.mockResolvedValueOnce({ status: 200, data: [{ symbol: "VCB" }] });
    const result = await fetchJson<any[]>("https://example.com/data.json", 5000);
    expect(result).toEqual([{ symbol: "VCB" }]);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      "https://example.com/data.json",
      expect.objectContaining({ timeout: 5000 })
    );
  });

  it("throws ApiError on non-200", async () => {
    const err: any = new Error("Not found");
    err.response = { status: 404, statusText: "Not Found" };
    mockedAxios.get.mockRejectedValueOnce(err);
    await expect(fetchJson("https://example.com/x", 5000)).rejects.toThrow(ApiError);
  });

  it("throws NetworkError on timeout/connection error", async () => {
    const err: any = new Error("timeout");
    err.code = "ECONNABORTED";
    mockedAxios.get.mockRejectedValueOnce(err);
    await expect(fetchJson("https://example.com/x", 5000)).rejects.toThrow(NetworkError);
  });
});
