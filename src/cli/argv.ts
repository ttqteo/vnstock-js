/**
 * Default-to-quote shortcut: `vnstock MBB` becomes `vnstock quote MBB`.
 *
 * Callers pass the command list read off the commander program rather than a
 * hardcoded one. A hardcoded list silently swallows every new subcommand:
 * `vnstock market` gets taken for a ticker and answered with an empty price row
 * instead of an error, which is how this was found.
 *
 * Kept in its own module so it can be tested without importing the CLI entry
 * point, which parses argv on import.
 */
export function injectDefaultCommand(argv: string[], knownCommands: string[]): string[] {
  if (argv.length < 3) return argv;

  var out = argv.slice();
  var first = out[2];
  var isKnown = knownCommands.indexOf(first) !== -1;
  var isFlag = first.charAt(0) === "-";
  var looksLikeSymbols = /^[A-Za-z][A-Za-z0-9,]*$/.test(first);

  if (!isKnown && !isFlag && looksLikeSymbols) {
    out.splice(2, 0, "quote");
  }
  return out;
}
