import { INTERVAL_MAP } from "./constants";
import { InvalidParameterError } from "../errors";

/**
 * Validates whether the provided date string matches the YYYY-MM-DD format.
 *
 * @param date - The date string to validate.
 * @returns Returns true if the date is in the correct format.
 * @throws Will throw an InvalidParameterError if the date format is invalid.
 */

const validateDateFormat = (dateList: string[]): boolean => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  dateList.forEach((date) => {
    if (!regex.test(date)) {
      throw new InvalidParameterError("date", date);
    }
  });
  return true;
};

/**
 * Validates the input timeFrame against the available intervals.
 * If the timeFrame is not provided, it will be ignored.
 * Kiểm tra tính hợp lệ của tham số timeFrame.
 * Nếu tham số timeFrame không được cung cấp, nó sẽ bị bỏ qua.
 */
const inputValidation = (timeFrame?: string) => {
  if (timeFrame) {
    if (!(timeFrame in INTERVAL_MAP)) {
      throw new InvalidParameterError("timeFrame", timeFrame, Object.keys(INTERVAL_MAP));
    }
  }
};

/**
 * The upstream chart endpoint treats its `end` bound as exclusive: asking for
 * end=2026-07-21 returns bars up to 2026-07-20. `asOf` means "include this
 * session", so shift a day forward when translating one into the other.
 *
 * Verified against the live endpoint rather than assumed.
 */
const asOfToExclusiveEnd = (asOf: string): string => {
  validateDateFormat([asOf]);
  const d = new Date(asOf + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().substring(0, 10);
};

export { validateDateFormat, inputValidation, asOfToExclusiveEnd };
