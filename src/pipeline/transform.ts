import { ictDate } from "../shared/time";
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

  // Date fields: unix timestamp (seconds, or ms past 1e12) to the ICT date; ISO strings keep their date part
  for (const field of config.dateFields) {
    const v = result[field];
    if (typeof v === "number" && isFinite(v) && v > 0) result[field] = ictDate(v > 1e12 ? v / 1000 : v);
    else if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) result[field] = v.substring(0, 10);
  }

  // Percent fields: divide by 100
  for (const field of config.percentFields) {
    if (typeof result[field] === "number") {
      result[field] = (result[field] as number) / 100;
    }
  }

  return result;
}
