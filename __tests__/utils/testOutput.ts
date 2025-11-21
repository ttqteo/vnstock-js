import * as fs from "fs";
import * as path from "path";

const date = new Date();
const folderName = date.toISOString().split(".")[0].replace(/T/, "-").replace(/:/g, "-");

export const saveTestOutput = (testName: string, data: any) => {
  const outputDir = path.join(process.cwd(), "test-outputs", folderName);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filename =
    testName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") + `.json`;

  const filePath = path.join(outputDir, filename);

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

export const saveTestOutputTicker = (testName: string, ticker: string, data: any) => {
  const outputDir = path.join(process.cwd(), "test-outputs", folderName, ticker);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filename = `${testName}.json`;

  const filePath = path.join(outputDir, filename);

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};
