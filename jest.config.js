module.exports = {
  preset: "ts-jest/presets/js-with-ts",
  reporters: [
    "default",
    ["<rootDir>/scripts/jest-markdown-reporter.js", { outputDir: "docs/reports" }],
  ],
  projects: [
    {
      displayName: "test",
      moduleDirectories: ["<rootDir>/src/", "node_modules"],
      moduleFileExtensions: ["ts", "js"],
      resetMocks: true,
      testRegex: ".*\\.(test|spec)\\.(ts)$",
      transform: {
        "^.+\\.ts$": ["ts-jest", { tsconfig: "<rootDir>/jest.tsconfig.json" }],
      },
    },
  ],
};
