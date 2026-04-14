import axios from "axios";
import { NetworkError, ApiError } from "../errors";

export async function fetchJson<T>(url: string, timeoutMs: number): Promise<T> {
  try {
    const response = await axios.get<T>(url, {
      timeout: timeoutMs,
      responseType: "json",
      headers: { Accept: "application/json" },
    });
    if (response.status !== 200) {
      throw new ApiError(
        "Unexpected status " + response.status + " for " + url,
        response.status
      );
    }
    return response.data;
  } catch (err: any) {
    if (err instanceof ApiError || err instanceof NetworkError) {
      throw err;
    }
    // axios error shape: has .response with status
    if (err && err.response && typeof err.response.status === "number") {
      throw new ApiError(
        "HTTP " + err.response.status + " " + (err.response.statusText || "") + " for " + url,
        err.response.status,
        err instanceof Error ? err : undefined
      );
    }
    // Network-level error (timeout, DNS, refused)
    throw new NetworkError(
      "Network error fetching " + url + ": " + (err && err.message ? err.message : String(err)),
      err instanceof Error ? err : undefined
    );
  }
}
