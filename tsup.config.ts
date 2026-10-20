import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      index: "src/index.ts",
      indicators: "src/indicators/index.ts",
      proxy: "src/proxy/index.ts",
      node: "src/node/index.ts",
    },
    format: ["esm", "cjs"],
    dts: true,
    clean: false,
    target: "es2020",
    external: ["ws"],
  },
  {
    entry: { cli: "src/cli/index.ts" },
    format: ["cjs"],
    target: "node18",
    clean: false,
  },
]);
