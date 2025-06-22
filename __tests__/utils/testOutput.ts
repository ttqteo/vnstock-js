import * as fs from "fs";
import * as path from "path";

const now = new Date().toISOString().split("T")[0];

export const saveTestOutput = (testName: string, data: any) => {
  const outputDir = path.join(process.cwd(), "test-outputs");

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const filename =
    now +
    "-" +
    testName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") +
    `.json`;

  const filePath = path.join(outputDir, filename);

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  console.log(`Output saved to: ${filePath}`);
};

export const saveTestOutputTicker = (testName: string, ticker: string, data: any) => {
  const outputDir = path.join(process.cwd(), "test-outputs", ticker);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const filename = `${now}-${testName}.json`;

  const filePath = path.join(outputDir, filename);

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  console.log(`Output saved to: ${filePath}`);
};
