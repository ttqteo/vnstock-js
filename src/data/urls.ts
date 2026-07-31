export const DEFAULT_SYMBOLS_URL =
  "https://raw.githubusercontent.com/ttqteo/vnstock-js/master/data/symbols.json";

export const DEFAULT_HOLIDAYS_URL =
  "https://raw.githubusercontent.com/ttqteo/vnstock-js/master/data/holidays.json";

/**
 * Slow-moving fundamentals only: ROE, ROA, margins, share count. These are
 * quarterly figures, so a day-old copy is the same copy.
 *
 * Deliberately excludes PE, PB, PS and market cap. Those are derived from the
 * live price and would be wrong the day after the file was built.
 */
export const DEFAULT_RATIOS_URL =
  "https://raw.githubusercontent.com/ttqteo/vnstock-js/master/data/ratios.json";

export const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_FETCH_TIMEOUT_MS = 10000;
