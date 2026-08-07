import * as fs from "fs";
import * as os from "os";
import * as path from "path";

/**
 * Regression guard for the serverless import crash: index.ts builds a
 * Watchlist at import time, so the default storage must not touch the disk
 * until someone actually reads or writes, and a home directory it cannot
 * create must not throw.
 *
 * os.homedir is mocked rather than driven through env vars so the test can
 * never reach the real home directory.
 */
let fakeHome: string;

jest.mock("os", () => {
  const actual = jest.requireActual("os");
  return { ...actual, homedir: () => (global as any).__vnstockFakeHome ?? actual.homedir() };
});

import { defaultStorage } from "../src/watchlist/storage";

const setHome = (dir: string) => {
  fakeHome = dir;
  (global as any).__vnstockFakeHome = dir;
};

describe("watchlist default storage", () => {
  const fallback = path.join(os.tmpdir(), "vnstock-js", "watchlist.json");

  afterEach(() => {
    delete (global as any).__vnstockFakeHome;
    if (fs.existsSync(fallback)) fs.unlinkSync(fallback);
  });

  it("creates nothing on disk when constructed", () => {
    setHome(path.join(os.tmpdir(), `vnhome-${Date.now()}-${Math.random().toString(36).slice(2)}`));

    defaultStorage();

    expect(fs.existsSync(fakeHome)).toBe(false);
  });

  it("returns null instead of throwing when home does not exist", async () => {
    setHome(path.join(os.tmpdir(), `vnhome-missing-${Date.now()}`));

    await expect(defaultStorage().read()).resolves.toBeNull();
  });

  it("falls back to the temp directory when home cannot be created", async () => {
    // A regular file makes any mkdir underneath fail, the way a read-only
    // serverless filesystem does.
    const blocker = path.join(os.tmpdir(), `vnhome-file-${Date.now()}`);
    fs.writeFileSync(blocker, "not a directory");
    setHome(blocker);

    await defaultStorage().write(JSON.stringify({ demo: { symbols: ["VCB"], createdAt: "x" } }));

    expect(fs.existsSync(fallback)).toBe(true);
    fs.unlinkSync(blocker);
  });
});
