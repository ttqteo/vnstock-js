var VN_OFFSET_MS = 7 * 60 * 60 * 1000;

export function formatDate(d: Date): string {
  var y = d.getUTCFullYear();
  var m = d.getUTCMonth() + 1;
  var day = d.getUTCDate();
  return (
    y +
    "-" +
    (m < 10 ? "0" : "") +
    m +
    "-" +
    (day < 10 ? "0" : "") +
    day
  );
}

export function nowVN(): Date {
  return new Date(Date.now() + VN_OFFSET_MS);
}

export function todayISO(): string {
  return formatDate(nowVN());
}

export function parseDateInput(input: string, today: Date = nowVN()): string {
  if (input === "today") return formatDate(today);

  var absolute = /^(\d{4})-(\d{2})-(\d{2})$/;
  if (absolute.test(input)) return input;

  var relative = /^(\d+)([dwmy])$/;
  var match = relative.exec(input);
  if (!match) {
    throw new Error(
      "Invalid date format: '" +
        input +
        "'. Use YYYY-MM-DD or relative (e.g. 7d, 1w, 1m, 1y)."
    );
  }

  var n = parseInt(match[1], 10);
  var unit = match[2];
  var result = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );

  if (unit === "d") {
    result.setUTCDate(result.getUTCDate() - n);
  } else if (unit === "w") {
    result.setUTCDate(result.getUTCDate() - n * 7);
  } else if (unit === "m") {
    var origDayM = result.getUTCDate();
    result.setUTCDate(1);
    result.setUTCMonth(result.getUTCMonth() - n);
    var lastDayM = new Date(
      Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)
    ).getUTCDate();
    result.setUTCDate(Math.min(origDayM, lastDayM));
  } else if (unit === "y") {
    var origDayY = result.getUTCDate();
    result.setUTCDate(1);
    result.setUTCFullYear(result.getUTCFullYear() - n);
    var lastDayY = new Date(
      Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)
    ).getUTCDate();
    result.setUTCDate(Math.min(origDayY, lastDayY));
  }

  return formatDate(result);
}
