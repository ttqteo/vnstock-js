import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { init, getSymbols, getHolidays, isInitialized, _reset } from "../src/data";
import { NotInitializedError, DataUnavailableError } from "../src/errors";

jest.mock("axios");
import axios from "axios";
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("data module init", () => {
  let tmpDir: string;

  beforeEach(() => {
    _reset();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vnstock-data-test-"));
    jest.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("getSymbols throws NotInitializedError before init", () => {
    expect(() => getSymbols()).toThrow(NotInitializedError);
  });

  it("getHolidays throws NotInitializedError before init", () => {
    expect(() => getHolidays()).toThrow(NotInitializedError);
  });

  it("isInitialized returns false before init, true after", async () => {
    expect(isInitialized()).toBe(false);
    mockedAxios.get
      .mockResolvedValueOnce({ status: 200, data: [{ symbol: "VCB" }] })
      .mockResolvedValueOnce({ status: 200, data: { "2025": [] } });
    await init({ cacheDir: tmpDir });
    expect(isInitialized()).toBe(true);
  });

  it("fetches both datasets and exposes them via getters", async () => {
    mockedAxios.get
      .mockResolvedValueOnce({ status: 200, data: [{ symbol: "VCB" }, { symbol: "FPT" }] })
      .mockResolvedValueOnce({ status: 200, data: { "2025": ["2025-01-01"] } });
    await init({ cacheDir: tmpDir });
    expect(getSymbols()).toEqual([{ symbol: "VCB" }, { symbol: "FPT" }]);
    expect(getHolidays()).toEqual({ "2025": ["2025-01-01"] });
  });

  it("uses cache on second init within TTL (no refetch)", async () => {
    mockedAxios.get
      .mockResolvedValueOnce({ status: 200, data: [{ symbol: "VCB" }] })
      .mockResolvedValueOnce({ status: 200, data: {} });
    await init({ cacheDir: tmpDir });

    _reset();
    await init({ cacheDir: tmpDir, ttl: 60_000 });
    expect(mockedAxios.get).toHaveBeenCalledTimes(2); // only the first init fetched
    expect(getSymbols()).toEqual([{ symbol: "VCB" }]);
  });

  it("force refresh bypasses cache", async () => {
    mockedAxios.get
      .mockResolvedValueOnce({ status: 200, data: [{ symbol: "A" }] })
      .mockResolvedValueOnce({ status: 200, data: {} })
      .mockResolvedValueOnce({ status: 200, data: [{ symbol: "B" }] })
      .mockResolvedValueOnce({ status: 200, data: {} });
    await init({ cacheDir: tmpDir });
    _reset();
    await init({ cacheDir: tmpDir, force: true });
    expect(mockedAxios.get).toHaveBeenCalledTimes(4);
    expect(getSymbols()).toEqual([{ symbol: "B" }]);
  });

  it("falls back to stale disk cache when fetch fails", async () => {
    mockedAxios.get
      .mockResolvedValueOnce({ status: 200, data: [{ symbol: "OLD" }] })
      .mockResolvedValueOnce({ status: 200, data: {} });
    await init({ cacheDir: tmpDir });
    _reset();
    const netErr: any = new Error("no network");
    netErr.code = "ECONNABORTED";
    mockedAxios.get
      .mockRejectedValueOnce(netErr)
      .mockRejectedValueOnce(netErr);
    await init({ cacheDir: tmpDir, ttl: 1, force: true });
    expect(getSymbols()).toEqual([{ symbol: "OLD" }]);
  });

  it("throws DataUnavailableError when fetch fails and no cache", async () => {
    const netErr: any = new Error("no network");
    netErr.code = "ECONNABORTED";
    mockedAxios.get.mockRejectedValue(netErr);
    await expect(init({ cacheDir: tmpDir })).rejects.toThrow(DataUnavailableError);
  });

  it("noCache skips disk writes", async () => {
    mockedAxios.get
      .mockResolvedValueOnce({ status: 200, data: [{ symbol: "X" }] })
      .mockResolvedValueOnce({ status: 200, data: {} });
    await init({ cacheDir: tmpDir, noCache: true });
    expect(fs.existsSync(path.join(tmpDir, "symbols.json"))).toBe(false);
  });

  it("respects custom URLs", async () => {
    mockedAxios.get
      .mockResolvedValueOnce({ status: 200, data: [] })
      .mockResolvedValueOnce({ status: 200, data: {} });
    await init({
      cacheDir: tmpDir,
      symbolsUrl: "https://internal.example/symbols.json",
      holidaysUrl: "https://internal.example/holidays.json",
    });
    expect(mockedAxios.get).toHaveBeenNthCalledWith(
      1,
      "https://internal.example/symbols.json",
      expect.anything()
    );
    expect(mockedAxios.get).toHaveBeenNthCalledWith(
      2,
      "https://internal.example/holidays.json",
      expect.anything()
    );
  });
});
