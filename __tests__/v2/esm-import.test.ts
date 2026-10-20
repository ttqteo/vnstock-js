import { buildSync } from "esbuild";
import { execFileSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { pathToFileURL } from "url";

// Bundles entries the way tsup does for dist/*.mjs, so the ESM build has no `require`.
const outDir = path.join(__dirname, "..", "..", "node_modules", ".cache", "vnstock-esm-test");
const ENTRIES: Record<string, string> = { index: "src/index.ts", node: "src/node/index.ts", realtime: "src/realtime/index.ts" };

beforeAll(() => {
  for (const name of Object.keys(ENTRIES)) {
    buildSync({
      entryPoints: [ENTRIES[name]],
      bundle: true,
      format: "esm",
      platform: "node",
      packages: "external",
      outfile: path.join(outDir, name + ".mjs"),
      logLevel: "silent",
    });
  }
});

function runModule(entry: string, script: string): string {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "vnstock-esm-"));
  try {
    const url = pathToFileURL(path.join(outDir, entry + ".mjs")).href;
    const code = `const m = await import(${JSON.stringify(url)});\n${script}`;
    return execFileSync(process.execPath, ["--input-type=module", "-e", code], {
      env: { ...process.env, HOME: home, USERPROFILE: home, VNSTOCK_TEST_DIR: home },
      encoding: "utf8",
    }).trim();
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
}

describe("ESM builds", () => {
  it("import the root entry without touching require", () => {
    expect(runModule("index", "console.log(typeof m.vn.stock, typeof m.createClient);")).toBe("function function");
  });

  it("keep file storage working from vnstock-js/node", () => {
    const out = runModule("node", "const s = m.fileStorage(process.env.VNSTOCK_TEST_DIR + '/store'); await s.set('k', 'v'); console.log(await s.get('k'));");
    expect(out).toBe("v");
  });

  it("let realtime fall back to the global WebSocket", () => {
    const out = runModule(
      "realtime",
      [
        "globalThis.WebSocket = class { constructor(url) { globalThis.wsUrl = url; } close() {} };",
        "const c = new m.RealtimeClient({ url: 'wss://example.test/rt' });",
        "c.connect(); c.disconnect();",
        "console.log(globalThis.wsUrl);",
      ].join("\n")
    );
    expect(out).toBe("wss://example.test/rt");
  });
});
