/* eslint-disable */
const fs = require("fs");
const path = require("path");

function pad2(n) { return String(n).padStart(2, "0"); }

function timestamp(d) {
  return (
    d.getFullYear() +
    "_" + pad2(d.getMonth() + 1) +
    "_" + pad2(d.getDate()) +
    "_" + pad2(d.getHours()) + pad2(d.getMinutes())
  );
}

function humanTime(d) {
  return (
    d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()) +
    " " + pad2(d.getHours()) + ":" + pad2(d.getMinutes()) + ":" + pad2(d.getSeconds())
  );
}

function relPath(p) {
  return path.relative(process.cwd(), p).replace(/\\/g, "/");
}

function statusIcon(s) {
  if (s === "passed") return "✓";
  if (s === "failed") return "✗";
  if (s === "skipped" || s === "pending" || s === "todo") return "○";
  return "?";
}

class MarkdownReporter {
  constructor(globalConfig, options) {
    this.outputDir = (options && options.outputDir) || "docs/reports";
    this.gitCommit = null;
    this.gitBranch = null;
    this.pkgVersion = null;
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
      this.pkgVersion = pkg.version;
    } catch (_) {}
    try {
      const { execSync } = require("child_process");
      this.gitCommit = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
      this.gitBranch = execSync("git rev-parse --abbrev-ref HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    } catch (_) {}
  }

  onRunComplete(_, results) {
    const now = new Date();
    const filename = `report_test_${timestamp(now)}.md`;
    const outPath = path.join(process.cwd(), this.outputDir, filename);

    if (!fs.existsSync(path.dirname(outPath))) {
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
    }

    const totalSuites = results.numTotalTestSuites;
    const passSuites = results.numPassedTestSuites;
    const failSuites = results.numFailedTestSuites;
    const totalTests = results.numTotalTests;
    const passTests = results.numPassedTests;
    const failTests = results.numFailedTests;
    const skipTests = results.numPendingTests + (results.numTodoTests || 0);
    const durationMs = (results.startTime ? now.getTime() - results.startTime : 0);
    const durationSec = (durationMs / 1000).toFixed(2);

    const lines = [];
    lines.push(`# Test Run Report — ${humanTime(now)}`);
    lines.push("");
    if (this.gitBranch) lines.push(`**Branch:** \`${this.gitBranch}\`` + (this.gitCommit ? ` (\`${this.gitCommit}\`)` : ""));
    if (this.pkgVersion) lines.push(`**Version:** \`${this.pkgVersion}\``);
    lines.push(`**Node:** \`${process.version}\` · **Platform:** \`${process.platform}\``);
    lines.push("");
    lines.push("## Summary");
    lines.push("");
    lines.push("| Metric | Count |");
    lines.push("|---|---|");
    lines.push(`| Test suites | ${passSuites} passed / ${failSuites} failed / ${totalSuites} total |`);
    lines.push(`| Tests | **${passTests} passed** / ${failTests} failed / ${skipTests} skipped / ${totalTests} total |`);
    lines.push(`| Duration | ${durationSec}s |`);
    lines.push("");

    const overall = failTests === 0 && failSuites === 0 ? "✅ All green" : `❌ ${failTests} test(s) failing in ${failSuites} suite(s)`;
    lines.push(`**Status:** ${overall}`);
    lines.push("");

    const failures = [];
    const skips = [];
    const suiteRows = [];

    for (const suite of results.testResults) {
      const file = relPath(suite.testFilePath);
      const sPass = suite.numPassingTests;
      const sFail = suite.numFailingTests;
      const sSkip = suite.numPendingTests + (suite.numTodoTests || 0);
      const sDur = ((suite.perfStats && (suite.perfStats.end - suite.perfStats.start)) || 0) / 1000;
      const status = suite.numFailingTests > 0 ? "✗" : "✓";
      suiteRows.push(`| ${status} | \`${file}\` | ${sPass} | ${sFail} | ${sSkip} | ${sDur.toFixed(2)}s |`);

      for (const t of suite.testResults || []) {
        if (t.status === "failed") {
          failures.push({
            file,
            name: (t.ancestorTitles || []).concat([t.title]).join(" › "),
            messages: (t.failureMessages || []).join("\n").split("\n").slice(0, 6).join("\n"),
          });
        }
        if (t.status === "pending" || t.status === "skipped" || t.status === "todo") {
          skips.push({
            file,
            name: (t.ancestorTitles || []).concat([t.title]).join(" › "),
          });
        }
      }
    }

    lines.push("## Suites");
    lines.push("");
    lines.push("| | File | Pass | Fail | Skip | Time |");
    lines.push("|---|---|---|---|---|---|");
    suiteRows.sort();
    lines.push(suiteRows.join("\n"));
    lines.push("");

    if (failures.length > 0) {
      lines.push("## Failures");
      lines.push("");
      for (const f of failures) {
        lines.push(`### ✗ \`${f.file}\` — ${f.name}`);
        lines.push("");
        lines.push("```");
        lines.push(f.messages.replace(/\[[0-9;]*m/g, ""));
        lines.push("```");
        lines.push("");
      }
    }

    if (skips.length > 0) {
      lines.push("## Skipped");
      lines.push("");
      for (const s of skips) {
        lines.push(`- \`${s.file}\` — ${s.name}`);
      }
      lines.push("");
    }

    lines.push("---");
    lines.push("");
    lines.push(`_Generated by \`scripts/jest-markdown-reporter.js\` at ${humanTime(now)}._`);
    lines.push("");

    fs.writeFileSync(outPath, lines.join("\n"), "utf8");
    process.stdout.write(`\n📝 Test report saved: ${relPath(outPath)}\n`);
  }
}

module.exports = MarkdownReporter;
