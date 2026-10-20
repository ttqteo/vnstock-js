import { buildSync } from "esbuild";

it("bundles vnstock-js/indicators for the browser without Node built-ins", () => {
  const r = buildSync({ entryPoints: ["src/indicators/index.ts"], bundle: true, platform: "browser", write: false, logLevel: "silent" });
  const code = r.outputFiles[0].text;
  expect(code).not.toMatch(/require\(["'](fs|ws|os|path)["']\)/);
  expect(code).toContain("marketHealth");
});
