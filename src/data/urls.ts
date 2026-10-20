export const DEFAULT_SYMBOLS_URL = "https://raw.githubusercontent.com/ttqteo/vnstock-js/master/data/symbols.json";

export const DEFAULT_HOLIDAYS_URL = "https://raw.githubusercontent.com/ttqteo/vnstock-js/master/data/holidays.json";

/**
 * Slow-moving fundamentals only: ROE, ROA, margins, share count. These are
 * quarterly figures, so a day-old copy is the same copy.
 *
 * Deliberately excludes PE, PB, PS and market cap. Those are derived from the
 * live price and would be wrong the day after the file was built.
 */
export const DEFAULT_RATIOS_URL = "https://raw.githubusercontent.com/ttqteo/vnstock-js/master/data/ratios.json";

/** One day in ms. */
export const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_FETCH_TIMEOUT_MS = 10000;

/** Foreign flow recordings: index.json lists the months, YYYY/MM.json holds one month. */
export const DEFAULT_FOREIGN_BASE_URL = "https://raw.githubusercontent.com/ttqteo/vnstock-js/master/data/foreign";

/** How long the month in progress and the month list count as fresh. One hour in ms. */
export const FOREIGN_TTL_MS = 60 * 60 * 1000;
