import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { init, _reset } from "../../src/data";

const symbolsFixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "..", "data", "symbols.json"), "utf8")
);
const holidaysFixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "..", "data", "holidays.json"), "utf8")
);

export async function initWithFixtures(mockedAxios: any): Promise<void> {
  _reset();
  mockedAxios.get
    .mockResolvedValueOnce({ status: 200, data: symbolsFixture })
    .mockResolvedValueOnce({ status: 200, data: holidaysFixture });
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "test-init-"));
  await init({ cacheDir: tmpDir, noCache: true });
}
