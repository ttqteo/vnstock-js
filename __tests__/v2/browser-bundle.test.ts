import { buildSync } from "esbuild";

// watch() pulls realtime into the root entry, so both must bundle for a browser as tsup ships them (ws external).
it.each(["src/index.ts", "src/realtime/index.ts"])("bundles %s for the browser without Node built-ins", (entry) => {
  const r = buildSync({ entryPoints: [entry], bundle: true, platform: "browser", format: "esm", external: ["ws"], write: false, logLevel: "silent" });
  expect(r.outputFiles[0].text).not.toMatch(/from ["'](events|fs|os|path)["']|require\(["'](events|fs|os|path)["']\)/);
});
