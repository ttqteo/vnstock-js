const path = require("path");

module.exports = {
  preset: "ts-jest/presets/js-with-ts",
  globals: {
    "ts-jest": {
      tsConfig: path.resolve("jest.tsconfig.json"),
    },
  },
  projects: [
    {
      displayName: "test",
      moduleDirectories: ["<rootDir>/src/", "node_modules"],
      moduleFileExtensions: ["ts", "js"],
      resetMocks: true,
      setupFiles: ["dotenv/config"],
      // setupFilesAfterEnv: ["jest-expect-message", "jest-extended"],
      testRegex: ".*\\.(test|spec)\\.(ts)$",
      transform: {
        ".(ts)": "ts-jest",
      },
    },
  ],
};
