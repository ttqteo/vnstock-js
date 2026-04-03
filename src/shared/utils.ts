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

export { validateDateFormat, inputValidation };
