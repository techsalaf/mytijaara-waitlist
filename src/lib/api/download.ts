import { ApiError } from "./client";
import { API_BASE_URL, serverApiBaseUrl } from "./base-url";

/**
 * Authenticated file downloads.
 *
 * `apiCall` parses JSON, so it cannot be used for the streamed CSV endpoints
 * (`/waitlist/export`, `/referrals/export`). Those need the bearer token on the
 * request, which rules out pointing an `<a href>` at them, so the file is
 * fetched as a blob and handed to a synthetic anchor.
 */

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

/**
 * GET a streamed endpoint and save it as `filename`.
 *
 * Rejects with `ApiError` on a non-2xx, reading the JSON `message` when the
 * backend sent one, so a 403 from a missing permission surfaces as the real
 * reason instead of downloading a file full of an error page.
 */
export async function downloadEndpoint(
  endpoint: string,
  filename: string,
  timeoutMs = 60000,
): Promise<number> {
  const baseUrl = resolveBaseUrl();
  if (!baseUrl) {
    throw new ApiError("The API is not configured. Set VITE_API_BASE_URL.", 503);
  }

  const headers: Record<string, string> = { Accept: "text/csv, application/json" };
  const token = getAuthToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const controller = timeoutMs > 0 ? new AbortController() : undefined;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : undefined;

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${endpoint}`, {
      method: "GET",
      headers,
      credentials: "omit",
      signal: controller?.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("The export timed out. Try a narrower filter.", 408);
    }
    throw new ApiError("Could not reach the server. Check your connection and try again.", 0);
  } finally {
    if (timer) clearTimeout(timer);
  }

  if (!response.ok) {
    let message = response.statusText || "The export failed";
    try {
      const payload = (await response.json()) as { message?: string };
      if (payload?.message) message = payload.message;
    } catch {
      // Not JSON. The status text is the best available message.
    }
    throw new ApiError(message, response.status);
  }

  const blob = await response.blob();
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(href);

  return blob.size;
}
