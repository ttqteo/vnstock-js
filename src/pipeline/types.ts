export interface TransformConfig {
  /** Maps raw API field name → normalized field name */
  fieldMap: Record<string, string>;
  /** Timestamp fields to convert to the ICT date "YYYY-MM-DD" (applied AFTER rename) */
  dateFields: string[];
  /** Percentage fields to divide by 100 (applied AFTER rename) */
  percentFields: string[];
  /** If true, keep fields not in fieldMap. Default: false (drop them) */
  keepExtra?: boolean;
}
