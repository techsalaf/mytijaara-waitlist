/**
 * API client. When `VITE_API_BASE_URL` is set, this makes real HTTP calls to
 * the Laravel backend. When it is unset, it falls back to the in-memory mock
 * factory so the preview and local development keep working without a backend.
 *
 * Backend agent: replace the mock behavior by setting VITE_API_BASE_URL.
 * Every consumer of `apiCall` keeps working unchanged.
 */

export type ApiResponse<T> = {
  data: T;
  meta?: Record<string, unknown>;
};

type ApiCallOptions = {
  /** Simulated latency in ms (default 300–600) — only used in mock mode. */
  delay?: number;
  /** Simulate a failure ratio 0..1 for testing error states — only used in mock mode. */
  failRate?: number;
  /** HTTP method for real backend calls. */
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  /** JSON body for real backend calls. */
  body?: unknown;
  /** Multipart body for file uploads. When set, Content-Type is left to the browser. */
  formData?: FormData;
  /** Skip injecting the auth token (for public endpoints). */
  public?: boolean;
};

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;
  constructor(message: string, status = 500, errors?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

const API_BASE_URL =
  typeof import.meta !== "undefined" && import.meta.env
    ? (import.meta.env.VITE_API_BASE_URL as string | undefined)
    : undefined;

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("mytijaara_api_token");
  } catch {
    return null;
  }
}

async function httpCall<T>(endpoint: string, opts: ApiCallOptions = {}): Promise<ApiResponse<T>> {
  if (!API_BASE_URL) {
    throw new ApiError("The API is not configured. Set VITE_API_BASE_URL.", 503);
  }
  const url = `${API_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  // JSON requests set Content-Type; multipart uploads let the browser set the boundary.
  if (!opts.formData) {
    headers["Content-Type"] = "application/json";
  }

  if (!opts.public) {
    const token = getAuthToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const init: RequestInit = {
    method: opts.method || "GET",
    headers,
    credentials: "omit", // token auth, not cookies
  };

  if (typeof window !== "undefined") {
    headers["X-Requested-With"] = "XMLHttpRequest";
  }

  if (opts.formData !== undefined && opts.method !== "GET") {
    init.body = opts.formData;
  } else if (opts.body !== undefined && opts.method !== "GET") {
    init.body = JSON.stringify(opts.body);
  }

  const response = await fetch(url, init);
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload !== null && "message" in payload
        ? String(payload.message)
        : response.statusText || "Request failed";
    const errors =
      typeof payload === "object" && payload !== null && "errors" in payload
        ? (payload as { errors?: Record<string, string[]> }).errors
        : undefined;
    throw new ApiError(message, response.status, errors);
  }

  return payload as ApiResponse<T>;
}

export async function apiCall<T>(
  endpoint: string,
  _fallback: () => T | Promise<T>,
  opts: ApiCallOptions = {},
): Promise<ApiResponse<T>> {
  return httpCall<T>(endpoint, opts);
}
