import * as fs from "fs";
import * as path from "path";

const now = new Date().toISOString().split("T")[0];

export const saveTestOutput = (testName: string, data: any) => {
  const outputDir = path.join(process.cwd(), "test-outputs");

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  // Create a filename from the test name
  const filename =
    testName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") + `-${now}.json`;

  const filePath = path.join(outputDir, filename);

  // Save the data with pretty formatting
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  console.log(`Output saved to: ${filePath}`);
};

export const saveTestOutputTicker = (testName: string, ticker: string, data: any) => {
  const outputDir = path.join(process.cwd(), "test-outputs", ticker);

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  // Create a filename from the test name and ticker
  const filename = `${testName}-${now}.json`;

  const filePath = path.join(outputDir, filename);

  // Save the data with pretty formatting
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  console.log(`Output saved to: ${filePath}`);
};
