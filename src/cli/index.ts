import { Command } from "commander";
import { init } from "../data";
import { handleQuote, meta as quoteMeta } from "./commands/quote";
import { handleHistory, meta as historyMeta } from "./commands/history";
import { handleSearch, meta as searchMeta } from "./commands/search";
import { handleSymbols, meta as symbolsMeta } from "./commands/symbols";
import { handleMarket, meta as marketMeta } from "./commands/market";
import { handleForeign, meta as foreignMeta } from "./commands/foreign";
import { injectDefaultCommand } from "./argv";
import { checkForUpdate, printUpdateBanner } from "./update-check";
// eslint-disable-next-line @typescript-eslint/no-require-imports
var pkg = require("../../package.json");

// Fire update check in parallel with command; resolve banner data for later.
var updatePromise: Promise<string | null> = checkForUpdate(pkg.version).catch(
  function () {
    return null;
  }
);

interface CommandMeta {
  requiresData: boolean;
}

interface GlobalFlags {
  json?: boolean;
  csv?: boolean;
  noColor?: boolean;
  color?: boolean;
  quiet?: boolean;
  verbose?: boolean;
}

function resolveOutputOpts(flags: GlobalFlags): {
  json: boolean;
  csv: boolean;
  color: boolean;
  quiet: boolean;
  verbose: boolean;
} {
  var colorEnabled = flags.color !== false && Boolean(process.stdout.isTTY);
  return {
    json: Boolean(flags.json),
    csv: Boolean(flags.csv),
    color: colorEnabled,
    quiet: Boolean(flags.quiet),
    verbose: Boolean(flags.verbose),
  };
}

async function ensureInit(meta: CommandMeta, quiet: boolean): Promise<void> {
  if (!meta.requiresData) return;
  if (!quiet && process.stdout.isTTY) {
    process.stderr.write("Loading data...\n");
  }
  await init();
}

async function maybePrintUpdateBanner(flags: GlobalFlags): Promise<void> {
  if (flags.quiet) return;
  // Wait briefly for parallel check to resolve; if slow, skip to keep UX snappy.
  var latest = await Promise.race([
    updatePromise,
    new Promise<null>(function (resolve) {
      setTimeout(function () {
        resolve(null);
      }, 300);
    }),
  ]);
  if (latest) {
    printUpdateBanner(latest, pkg.version);
  }
}

async function runCommand(
  meta: CommandMeta,
  runner: () => Promise<string>,
  flags: GlobalFlags
): Promise<void> {
  try {
    await ensureInit(meta, Boolean(flags.quiet));
    var out = await runner();
    process.stdout.write(out + "\n");
    await maybePrintUpdateBanner(flags);
    process.exit(0);
  } catch (err) {
    var msg = err instanceof Error ? err.message : String(err);
    process.stderr.write("Error: " + msg + "\n");
    process.exit(1);
  }
}

function buildProgram(): Command {
  var program = new Command();
  program
    .name("vnstock")
    .description("CLI for Vietnam stock market data (vnstock-js)")
    .version(pkg.version, "-v, --version", "output the version number");

  program
    .command("quote")
    .description("Snapshot quote for a symbol")
    .argument("<symbol>")
    .option("--json", "output JSON")
    .option("--csv", "output CSV")
    .option("--no-color", "disable color")
    .option("--quiet", "suppress non-error logs")
    .option("--verbose", "show more details")
    .action(function (symbol: string, options: GlobalFlags) {
      var out = resolveOutputOpts(options);
      return runCommand(
        quoteMeta,
        function () {
          return handleQuote({
            symbol: symbol,
            json: out.json,
            csv: out.csv,
            color: out.color,
            quiet: out.quiet,
            verbose: out.verbose,
          });
        },
        options
      );
    });

  program
    .command("history")
    .description("Price history for a symbol")
    .argument("<symbol>")
    .option("--from <date>", "start date (YYYY-MM-DD or relative 7d/1w/1m/1y)")
    .option("--to <date>", "end date (YYYY-MM-DD or 'today')")
    .option("--range <range>", "shortcut for --from X --to today (default: 30d)")
    .option("--limit <n>", "max rows", function (v: string) {
      return parseInt(v, 10);
    })
    .option("--json", "output JSON")
    .option("--csv", "output CSV")
    .option("--no-color", "disable color")
    .option("--quiet", "suppress non-error logs")
    .option("--verbose", "show OHLC details")
    .action(function (symbol: string, options: any) {
      var out = resolveOutputOpts(options);
      return runCommand(
        historyMeta,
        function () {
          return handleHistory({
            symbol: symbol,
            from: options.from,
            to: options.to,
            range: options.range,
            limit: options.limit,
            json: out.json,
            csv: out.csv,
            color: out.color,
            quiet: out.quiet,
            verbose: out.verbose,
          });
        },
        options
      );
    });

  program
    .command("search")
    .description("Search symbols by name")
    .argument("<query>")
    .option("--limit <n>", "max results", function (v: string) {
      return parseInt(v, 10);
    })
    .option("--json", "output JSON")
    .option("--csv", "output CSV")
    .option("--no-color", "disable color")
    .option("--quiet", "suppress non-error logs")
    .option("--verbose", "show more details")
    .action(function (query: string, options: any) {
      var out = resolveOutputOpts(options);
      return runCommand(
        searchMeta,
        function () {
          return handleSearch({
            query: query,
            limit: options.limit,
            json: out.json,
            csv: out.csv,
            color: out.color,
            quiet: out.quiet,
            verbose: out.verbose,
          });
        },
        options
      );
    });

  program
    .command("symbols")
    .description("List symbols (optionally by exchange)")
    .option("--exchange <ex>", "HOSE, HNX, or UPCOM")
    .option("--limit <n>", "max results", function (v: string) {
      return parseInt(v, 10);
    })
    .option("--json", "output JSON")
    .option("--csv", "output CSV")
    .option("--no-color", "disable color")
    .option("--quiet", "suppress non-error logs")
    .option("--verbose", "show 2-column table with names")
    .action(function (options: any) {
      var out = resolveOutputOpts(options);
      return runCommand(
        symbolsMeta,
        function () {
          return handleSymbols({
            exchange: options.exchange,
            limit: options.limit,
            json: out.json,
            csv: out.csv,
            color: out.color,
            quiet: out.quiet,
            verbose: out.verbose,
          });
        },
        options
      );
    });

  program
    .command("market")
    .description("Market overview: index, liquidity, breadth, foreign flow")
    .option("--exchange <ex>", "HOSE (default), HNX, UPCOM, ALL")
    .option("--index <symbol>", "VNINDEX (default), VN30, HNXIndex")
    .option("--json", "output JSON")
    .option("--csv", "output CSV")
    .option("--no-color", "disable color")
    .option("--quiet", "suppress non-error logs")
    .option("--verbose", "show top foreign net buy/sell")
    .action(function (options: any) {
      var out = resolveOutputOpts(options);
      return runCommand(
        marketMeta,
        function () {
          return handleMarket({
            exchange: options.exchange,
            index: options.index,
            json: out.json,
            csv: out.csv,
            color: out.color,
            quiet: out.quiet,
            verbose: out.verbose,
          });
        },
        options
      );
    });

  program
    .command("foreign")
    .description("Foreign investor flow, current session (market-wide or one symbol)")
    .argument("[symbol]", "symbol; omit for market-wide")
    .option("--exchange <ex>", "HOSE (default), HNX, UPCOM, ALL")
    .option("--top <n>", "rows in top net buy/sell (default 10)", function (v: string) {
      return parseInt(v, 10);
    })
    .option("--json", "output JSON")
    .option("--csv", "output CSV")
    .option("--no-color", "disable color")
    .option("--quiet", "suppress non-error logs")
    .option("--verbose", "show more details")
    .action(function (symbol: string | undefined, options: any) {
      var out = resolveOutputOpts(options);
      return runCommand(
        foreignMeta,
        function () {
          return handleForeign({
            symbol: symbol,
            exchange: options.exchange,
            top: typeof options.top === "number" && !isNaN(options.top) ? options.top : 10,
            json: out.json,
            csv: out.csv,
            color: out.color,
            quiet: out.quiet,
            verbose: out.verbose,
          });
        },
        options
      );
    });

  program
    .command("mcp")
    .description("Start MCP server (stdio) for Claude Desktop / Cursor / VS Code")
    .action(async function () {
      var mod = await import("./mcp/index");
      await mod.start();
    });

  return program;
}

var program = buildProgram();
var commandNames = program.commands
  .map(function (c) {
    return c.name();
  })
  .concat(["help"]);

program.parseAsync(injectDefaultCommand(process.argv, commandNames)).catch(function (err: any) {
  process.stderr.write("Fatal: " + (err && err.message) + "\n");
  process.exit(2);
});
