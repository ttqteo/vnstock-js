export interface TransformConfig {
  /** Maps raw API field name → normalized field name */
  fieldMap: Record<string, string>;
  /** Fields to divide by 1000 (applied AFTER rename) */
  priceFields: string[];
  /** Timestamp fields to convert to ISO date "YYYY-MM-DD" (applied AFTER rename) */
  dateFields: string[];
  /** Percentage fields to divide by 100 (applied AFTER rename) */
  percentFields: string[];
  /** If true, keep fields not in fieldMap. Default: false (drop them) */
  keepExtra?: boolean;
}

export interface RequestConfig {
  url: string;
  method: "GET" | "POST";
  data?: unknown;
  params?: Record<string, string | number>;
  headers?: Record<string, string>;
}

export interface FetchOptions {
  retries?: number;
  retryDelay?: number;
  rateLimitWait?: number;
}
