import { INTERVAL_MAP } from "./constants";

/**
 * Validates whether the provided date string matches the YYYY-MM-DD format.
 *
 * @param date - The date string to validate.
 * @returns Returns true if the date is in the correct format.
 * @throws Will throw an error if the date format is invalid.
 */

const validateDateFormat = (dateList: string[]): boolean => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  dateList.forEach((date) => {
    if (!regex.test(date)) {
      throw new Error("Invalid date format. Please use YYYY-MM-DD format.");
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
      throw new Error(`Invalid timeFrame ${timeFrame}, it should be one of ${Object.keys(INTERVAL_MAP).join(", ")}`);
    }
  }
};

export { validateDateFormat, inputValidation };
