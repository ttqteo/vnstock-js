import axios from "axios";
import { RequestConfig, FetchOptions } from "./types";
import { headers as defaultHeaders } from "../shared/constants";

function isRetryable(error: any): boolean {
  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") return true;
  if (error.response && error.response.status >= 500) return true;
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithRetry<T = unknown>(
  config: RequestConfig,
  options: FetchOptions = {}
): Promise<T> {
  const { retries = 2, retryDelay = 1000 } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await axios.request({
        url: config.url,
        method: config.method,
        data: config.data,
        params: config.params,
        headers: { ...defaultHeaders, ...config.headers },
        timeout: 15000,
      });
      return response.data as T;
    } catch (error) {
      lastError = error;
      if (attempt < retries && isRetryable(error)) {
        await sleep(retryDelay * Math.pow(2, attempt));
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}
