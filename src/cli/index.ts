import { Command } from "commander";
import { createClient } from "../client";
import { fileStorage } from "../node";
import { handleQuote } from "./commands/quote";
import { handleHistory } from "./commands/history";
import { handleSearch } from "./commands/search";
import { handleSymbols } from "./commands/symbols";
import { handleMarket } from "./commands/market";
import { handleForeign } from "./commands/foreign";
import { runTool, parseWhere, QUOTE_COLUMNS, GOLD_COLUMNS, Column } from "./commands/tool";
import { createHandlers } from "./mcp/handlers";
import { handlePortfolio } from "./commands/portfolio";
import { money } from "./format/money";
import { injectDefaultCommand } from "./argv";
import { checkForUpdate, printUpdateBanner } from "./update-check";
// eslint-disable-next-line @typescript-eslint/no-require-imports
var pkg = require("../../package.json");

// Fire update check in parallel with command; resolve banner data for later.
var updatePromise: Promise<string | null> = checkForUpdate(pkg.version).catch(function () {
  return null;
});

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

// One client for every command; datasets are cached under ~/.vnstock-js between runs.
var client = createClient({ storage: fileStorage() });
// The CLI prints what the MCP tools return, so the two never format differently.
var toolHandlers = createHandlers(client);

function intArg(v: string): number {
  return parseInt(v, 10);
}

function numArg(v: string): number {
  return parseFloat(v);
}

/** Screen cells: money in readable units, ratios to 3 decimals. */
function screenValue(v: any): string {
  if (typeof v !== "number") return String(v);
  return Math.abs(v) >= 1e6 ? money(v) : String(Math.round(v * 1000) / 1000);
}

function tool(name: string, args: Record<string, unknown>, flags: GlobalFlags, columns?: Column[]): Promise<void> {
  return runCommand(function () {
    return runTool(toolHandlers, name, args, { json: Boolean(flags.json), columns: columns });
  }, flags);
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

async function runCommand(runner: () => Promise<string>, flags: GlobalFlags): Promise<void> {
  // exitCode instead of process.exit(): exiting while fetch still holds keep-alive
  // sockets aborts Node on Windows (UV_HANDLE_CLOSING assertion). Idle sockets do
  // not hold the event loop, so the process ends on its own.
  try {
    var out = await runner();
    process.stdout.write(out + "\n");
    await maybePrintUpdateBanner(flags);
    process.exitCode = 0;
  } catch (err) {
    var e: any = err;
    var msg = err instanceof Error ? err.message : String(err);
    process.stderr.write("Error: " + msg + (e && e.hint ? "\nHint: " + e.hint : "") + "\n");
    process.exitCode = 1;
  }
}

function buildProgram(): Command {
  var program = new Command();
  program.name("vnstock").description("CLI for Vietnam stock market data (vnstock-js)").version(pkg.version, "-v, --version", "output the version number");

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
      return runCommand(function () {
        return handleQuote(client, {
          symbol: symbol,
          json: out.json,
          csv: out.csv,
          color: out.color,
          quiet: out.quiet,
          verbose: out.verbose,
        });
      }, options);
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
      return runCommand(function () {
        return handleHistory(client, {
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
      }, options);
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
      return runCommand(function () {
        return handleSearch(client, {
          query: query,
          limit: options.limit,
          json: out.json,
          csv: out.csv,
          color: out.color,
          quiet: out.quiet,
          verbose: out.verbose,
        });
      }, options);
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
      return runCommand(function () {
        return handleSymbols(client, {
          exchange: options.exchange,
          limit: options.limit,
          json: out.json,
          csv: out.csv,
          color: out.color,
          quiet: out.quiet,
          verbose: out.verbose,
        });
      }, options);
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
      return runCommand(function () {
        return handleMarket(client, {
          exchange: options.exchange,
          index: options.index,
          json: out.json,
          csv: out.csv,
          color: out.color,
          quiet: out.quiet,
          verbose: out.verbose,
        });
      }, options);
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
      return runCommand(function () {
        return handleForeign(client, {
          symbol: symbol,
          exchange: options.exchange,
          top: typeof options.top === "number" && !isNaN(options.top) ? options.top : 10,
          json: out.json,
          csv: out.csv,
          color: out.color,
          quiet: out.quiet,
          verbose: out.verbose,
        });
      }, options);
    });

  program
    .command("patterns")
    .description("Support/resistance zones, candle patterns, Turtle state and breakouts on a year of daily bars")
    .argument("<symbol>")
    .option("--recent <n>", "sessions to look back for candles and breakouts (default 10)", intArg)
    .option("--json", "output JSON")
    .option("--quiet", "suppress non-error logs")
    .action(function (symbol: string, options: any) {
      return tool("find_patterns", { symbol: symbol, recent: options.recent }, options);
    });

  program
    .command("similar")
    .description("Past sessions with a setup like today's and the change 5, 20, 60 sessions later (experimental)")
    .argument("<symbol>")
    .option("--top <n>", "matches to show (default 10)", intArg)
    .option("--json", "output JSON")
    .option("--quiet", "suppress non-error logs")
    .action(function (symbol: string, options: any) {
      return tool("find_similar_setups", { symbol: symbol, top: options.top }, options);
    });

  program
    .command("backtest")
    .description("Event-study backtest of a preset signal: breakout, oversold_bounce, ema_cross")
    .argument("<symbols...>")
    .requiredOption("--preset <name>", "breakout, oversold_bounce or ema_cross")
    .option("--tp <percent>", "take-profit in percent (default 7)", numArg)
    .option("--sl <percent>", "stop-loss in percent (default 4)", numArg)
    .option("--hold <n>", "sessions held at most (default 10)", intArg)
    .option("--range <range>", "1y, 2y (default), 5y, max")
    .option("--overlap", "count signals while a trade in the same symbol is open")
    .option("--json", "output JSON")
    .option("--quiet", "suppress non-error logs")
    .action(function (symbols: string[], options: any) {
      return tool(
        "backtest_signal",
        {
          symbols: symbols,
          preset: options.preset,
          tp: options.tp,
          sl: options.sl,
          hold: options.hold,
          range: options.range,
          overlap: Boolean(options.overlap),
        },
        options
      );
    });

  program
    .command("gold")
    .description("Domestic gold prices in dong per luong")
    .option("--source <name>", "auto (default), btmc, giavangnet")
    .option("--json", "output JSON")
    .option("--quiet", "suppress non-error logs")
    .action(function (options: any) {
      return tool("get_gold_price", { source: options.source }, options, GOLD_COLUMNS);
    });

  program
    .command("compare")
    .description("Quotes of 2 to 10 symbols side by side")
    .argument("<symbols...>")
    .option("--json", "output JSON")
    .option("--quiet", "suppress non-error logs")
    .action(function (symbols: string[], options: any) {
      return tool("compare_symbols", { symbols: symbols }, options, QUOTE_COLUMNS);
    });

  program
    .command("watchlist")
    .description("Watchlists in ~/.vnstock-js/watchlist.json: list_all, list, create, delete, add, remove, quote")
    .argument("[action]", "default list_all")
    .argument("[name]")
    .argument("[symbols...]")
    .option("--json", "output JSON")
    .option("--quiet", "suppress non-error logs")
    .action(function (action: string | undefined, name: string | undefined, symbols: string[], options: any) {
      var act = action || "list_all";
      return tool("watchlist", { action: act, name: name, symbols: symbols }, options, act === "quote" ? QUOTE_COLUMNS : undefined);
    });

  program
    .command("screen")
    .description('Screen a group or exchange, e.g. --group VN30 --where "pe<15,roe>0.15" --sort -roe')
    .option("--group <group>", "VN30, HNX30, ...")
    .option("--exchange <ex>", "HOSE, HNX, UPCOM")
    .option("--where <conditions>", "comma-separated: field<value, field>=value, ...")
    .option("--sort <field>", "field to sort by, - for descending")
    .option("--limit <n>", "rows (default 20)", intArg)
    .option("--json", "output JSON")
    .option("--quiet", "suppress non-error logs")
    .action(function (options: any) {
      return runCommand(function () {
        var filters = parseWhere(options.where || "");
        var fields = ["symbol"];
        filters.forEach(function (f) {
          if (fields.indexOf(f.field) === -1) fields.push(f.field);
        });
        var sortField = options.sort ? String(options.sort).replace(/^-/, "") : "";
        if (sortField && fields.indexOf(sortField) === -1) fields.push(sortField);
        var columns = fields.map(function (k) {
          return { key: k, label: k, format: screenValue };
        });
        return runTool(
          toolHandlers,
          "screen_stocks",
          { group: options.group, exchange: options.exchange, filters: filters, sort: options.sort, limit: options.limit },
          { json: Boolean(options.json), columns: columns }
        );
      }, options);
    });

  program
    .command("portfolio")
    .description("Saved holdings in ~/.vnstock-js/portfolio.json at live prices; add, remove, cash edit them")
    .argument("[action]", "add <symbol> <quantity> <cost> | remove <symbol> | cash <amount>; none shows the portfolio")
    .argument("[args...]")
    .option("--broker <name>", "broker of the position or cash")
    .option("--json", "output JSON")
    .option("--quiet", "suppress non-error logs")
    .action(function (action: string | undefined, args: string[], options: any) {
      return runCommand(function () {
        return handlePortfolio(client, toolHandlers, { json: Boolean(options.json), action: action, args: args, broker: options.broker });
      }, options);
    });

  program
    .command("mcp")
    .description("Start MCP server (stdio) for Claude Desktop / Cursor / VS Code")
    .action(async function () {
      var mod = await import("./mcp/index");
      await mod.start(client);
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
  process.exitCode = 2;
});
