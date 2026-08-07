/**
 * API client. Every call goes to the Laravel backend at `VITE_API_BASE_URL`.
 * There is no mock fallback: when the base URL is unset the call throws a 503
 * so a misconfigured deploy surfaces loudly instead of showing invented data.
 *
 * SSR route loaders use `serverGet` from `./base-url` instead, because a
 * relative base has no origin inside the server handler.
 */

export type ApiResponse<T> = {
  data: T;
  meta?: Record<string, unknown>;
};

export type ApiCallOptions = {
  /** HTTP method. Defaults to GET. */
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  /** JSON body. */
  body?: unknown;
  /** Multipart body for file uploads. When set, Content-Type is left to the browser. */
  formData?: FormData;
  /** Skip injecting the auth token (for public endpoints). */
  public?: boolean;
  /** Abort the request after this many ms. 0 disables the timeout. */
  timeoutMs?: number;
};

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;
  constructor(message: string, status = 500, errors?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.errors = errors;
  }

  /** First field-level message, falling back to the top-level message. */
  get firstError(): string {
    const first = this.errors ? Object.values(this.errors)[0]?.[0] : undefined;
    return first ?? this.message;
  }
}

import { API_BASE_URL, serverApiBaseUrl } from "./base-url";

/** Absolute in the SSR handler, possibly relative in the browser. */
function resolveBaseUrl(): string | undefined {
  if (typeof window === "undefined") return serverApiBaseUrl();
  return API_BASE_URL;
}

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("mytijaara_api_token");
  } catch {
    return null;
  }
}

async function httpCall<T>(endpoint: string, opts: ApiCallOptions = {}): Promise<ApiResponse<T>> {
  const baseUrl = resolveBaseUrl();
  if (!baseUrl) {
    throw new ApiError("The API is not configured. Set VITE_API_BASE_URL.", 503);
  }
  const url = `${baseUrl}${endpoint}`;
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

  // A hung request would otherwise leave a spinner up forever.
  const timeoutMs = opts.timeoutMs ?? 20000;
  let timer: ReturnType<typeof setTimeout> | undefined;
  if (timeoutMs > 0) {
    const controller = new AbortController();
    timer = setTimeout(() => controller.abort(), timeoutMs);
    init.signal = controller.signal;
  }

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("The request timed out. Check your connection and try again.", 408);
    }
    throw new ApiError("Could not reach the server. Check your connection and try again.", 0);
  } finally {
    if (timer) clearTimeout(timer);
  }

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

    // Fire a browser event on 401 so the admin shell can redirect to login
    // without every page needing to handle it individually.
    if (response.status === 401 && !opts.public && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("auth:expired"));
    }

    throw new ApiError(message, response.status, errors);
  }

  return payload as ApiResponse<T>;
}

/** Call a backend endpoint and return the parsed `{ data, meta }` envelope. */
export async function apiCall<T>(
  endpoint: string,
  opts: ApiCallOptions = {},
): Promise<ApiResponse<T>> {
  return httpCall<T>(endpoint, opts);
}
