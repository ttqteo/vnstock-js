import { format, fromUnixTime } from "date-fns";
import { TransformConfig } from "./types";

export function applyTransform(raw: Record<string, unknown>, config: TransformConfig): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  // Rename + filter fields
  for (const [rawKey, value] of Object.entries(raw)) {
    if (value === null || value === undefined) continue;

    const newKey = config.fieldMap[rawKey];
    if (newKey) {
      result[newKey] = value;
    } else if (config.keepExtra) {
      result[rawKey] = value;
    }
  }

  // Price fields: divide by 1000
  for (const field of config.priceFields) {
    if (typeof result[field] === "number") {
      result[field] = (result[field] as number) / 1000;
    }
  }

  // Date fields: unix timestamp → ISO date string
  for (const field of config.dateFields) {
    if (typeof result[field] === "number") {
      result[field] = format(fromUnixTime(result[field] as number), "yyyy-MM-dd");
    }
  }

  // Percent fields: divide by 100
  for (const field of config.percentFields) {
    if (typeof result[field] === "number") {
      result[field] = (result[field] as number) / 100;
    }
  }

  return result;
}
