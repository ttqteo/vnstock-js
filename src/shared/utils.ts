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

export { validateDateFormat };
