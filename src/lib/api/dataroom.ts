/**
 * Data room visitor API client.
 *
 * Deliberately NOT built on `apiCall` from `./client`. That client reads the
 * admin token out of `localStorage["mytijaara_api_token"]` and attaches it to
 * every non-public call. Reusing it here would put an admin bearer token on data
 * room requests and a visitor token nowhere, which is exactly the cross-domain
 * bleed the backend's separate guard exists to prevent.
 *
 * The two token namespaces never touch:
 *   admin    -> mytijaara_api_token       -> auth:sanctum
 *   visitor  -> mytijaara_dataroom_token  -> DataRoomAuthenticate
 *
 * No response from these endpoints ever carries a storage URL or a file path, so
 * bytes are fetched as blobs through `previewBlob()` / `download()` rather than
 * by pointing an element at a URL.
 */

import { ApiError, type ApiResponse } from "./client";
import { API_BASE_URL, serverApiBaseUrl } from "./base-url";

const TOKEN_KEY = "mytijaara_dataroom_token";

// -- token handling ---------------------------------------------------------

export function getDataRoomToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Stored in `sessionStorage`, not `localStorage`: the token dies with the tab
 * rather than outliving the visit on a shared machine. The server's two clocks
 * are the real expiry; this only narrows the window in which a forgotten tab
 * still holds a usable token.
 */
export function setDataRoomToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Private-mode storage refusal. The session still works for this page load.
  }
}

export function clearDataRoomToken(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // Nothing to do.
  }
}

// -- payload types ----------------------------------------------------------

export type DataRoomGate = {
  open: boolean;
  pinRequired: boolean;
  message: string | null;
};

export type DataRoomSessionInfo = {
  idleExpiresAt: string;
  absoluteExpiresAt: string;
  idleTimeoutMinutes: number;
};

export type DataRoomVisitor = {
  name: string | null;
  email: string;
  organization: string | null;
  role: string | null;
  expiresAt: string | null;
  acknowledgedAt: string | null;
  downloadsPermitted?: boolean;
};

export type DataRoomAuthResult = {
  token: string;
  session: DataRoomSessionInfo;
  visitor: DataRoomVisitor;
};

export type DataRoomMe = DataRoomVisitor & { session: DataRoomSessionInfo };

/**
 * `downloadPermitted` and `previewSupported` are affordances for rendering. The
 * server re-answers both on every byte request, so a stale value produces a 403
 * rather than a leak.
 */
export type DataRoomDocumentCard = {
  uuid: string;
  title: string;
  description: string | null;
  fileType: string;
  fileSize: number | null;
  version: string | null;
  confidentialityLevel: string;
  accessible: boolean;
  downloadPermitted: boolean;
  previewSupported: boolean;
  folderName?: string | null;
};

export type DataRoomDocumentDetail = DataRoomDocumentCard & {
  folderName: string | null;
  updatedAt: string | null;
  watermark: string[];
};

export type DataRoomFolderCard = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  accessible: boolean;
  accessibleCount: number;
  documents: DataRoomDocumentCard[];
};

export type DataRoomDashboard = {
  categoriesCount: number;
  totalDocuments: number;
  accessibleDocuments: number;
  restrictedDocuments: number;
  startHere: Array<Pick<DataRoomDocumentCard, "uuid" | "title" | "description" | "fileType">>;
  visitor: DataRoomVisitor;
};

export type DataRoomActivityRow = {
  action: string;
  documentTitle: string | null;
  at: string | null;
};

// -- transport --------------------------------------------------------------

function resolveBaseUrl(): string {
  const base = typeof window === "undefined" ? serverApiBaseUrl() : API_BASE_URL;
  if (!base) {
    throw new ApiError("The data room is not configured. Set VITE_API_BASE_URL.", 503);
  }
  return base;
}

type CallOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  /** Skip the visitor token (the gate and authenticate endpoints). */
  anonymous?: boolean;
  timeoutMs?: number;
};

async function request(endpoint: string, opts: CallOptions = {}): Promise<Response> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";

  if (!opts.anonymous) {
    const token = getDataRoomToken();
    if (!token) {
      // Fail here rather than sending an unauthenticated request, so the caller
      // gets one predictable "session ended" path instead of two.
      throw new ApiError("Your data room session has ended. Please sign in again.", 401);
    }
    headers["Authorization"] = `Bearer ${token}`;
  }

  const timeoutMs = opts.timeoutMs ?? 30000;
  const controller = timeoutMs > 0 ? new AbortController() : undefined;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : undefined;

  try {
    return await fetch(`${resolveBaseUrl()}${endpoint}`, {
      method: opts.method ?? "GET",
      headers,
      credentials: "omit", // bearer token, never a cookie
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: controller?.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("The request timed out. Check your connection and try again.", 408);
    }
    throw new ApiError("Could not reach the server. Check your connection and try again.", 0);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Read the backend's error envelope without ever inventing a message. */
async function toApiError(response: Response): Promise<ApiError> {
  let message = response.statusText || "Request failed";
  let errors: Record<string, string[]> | undefined;
  let retryAfter: number | undefined;
  try {
    const payload = (await response.json()) as {
      message?: string;
      errors?: Record<string, string[]>;
      retryAfter?: number;
    };
    if (payload?.message) message = payload.message;
    errors = payload?.errors;
    retryAfter = payload?.retryAfter;
  } catch {
    // Not JSON. The status text is the best available message.
  }
  const error = new ApiError(message, response.status, errors);
  if (retryAfter !== undefined) {
    (error as ApiError & { retryAfter?: number }).retryAfter = retryAfter;
  }
  return error;
}

async function json<T>(endpoint: string, opts: CallOptions = {}): Promise<T> {
  const response = await request(endpoint, opts);

  if (response.status === 401 && !opts.anonymous) {
    // The session is gone server-side. Drop the local token so the UI cannot
    // keep retrying with a token the server has already deleted.
    clearDataRoomToken();
  }

  if (!response.ok) throw await toApiError(response);

  const payload = (await response.json()) as ApiResponse<T>;
  return payload.data;
}

// -- API --------------------------------------------------------------------

export const dataRoomApi = {
  /** The only unauthenticated read. Three fields, nothing about the contents. */
  gate: () => json<DataRoomGate>("/dataroom/gate", { anonymous: true }),

  /**
   * Every failure returns one generic 401 by design. Do not try to interpret
   * the message; show it as sent.
   */
  authenticate: async (input: { email: string; code: string; pin?: string }) => {
    const result = await json<DataRoomAuthResult>("/dataroom/authenticate", {
      method: "POST",
      anonymous: true,
      body: { email: input.email, code: input.code, ...(input.pin ? { pin: input.pin } : {}) },
    });
    setDataRoomToken(result.token);
    return result;
  },

  me: () => json<DataRoomMe>("/dataroom/me"),

  /** Always resolves. The endpoint answers 200 whether or not a session existed. */
  logout: async () => {
    try {
      await request("/dataroom/logout", { method: "POST" });
    } catch {
      // A failed logout must not trap the visitor in the workspace.
    } finally {
      clearDataRoomToken();
    }
  },

  dashboard: () => json<DataRoomDashboard>("/dataroom/dashboard"),
  folders: () => json<DataRoomFolderCard[]>("/dataroom/folders"),
  search: (query: string) =>
    json<DataRoomDocumentCard[]>(`/dataroom/search?q=${encodeURIComponent(query)}`),
  document: (uuid: string) => json<DataRoomDocumentDetail>(`/dataroom/documents/${uuid}`),
  activity: () => json<DataRoomActivityRow[]>("/dataroom/activity"),
  acknowledge: () =>
    json<{ acknowledgedAt: string | null }>("/dataroom/acknowledge", { method: "POST" }),

  /**
   * Fetch preview bytes as an object URL. The token has to travel in a header,
   * which rules out pointing an `<iframe src>` or `<img src>` at the endpoint.
   * Callers must revoke the URL when they unmount.
   */
  previewBlob: async (uuid: string): Promise<{ url: string; contentType: string }> => {
    const response = await request(`/dataroom/documents/${uuid}/preview`, { timeoutMs: 120000 });
    if (response.status === 401) clearDataRoomToken();
    if (!response.ok) throw await toApiError(response);
    const blob = await response.blob();
    return {
      url: URL.createObjectURL(blob),
      contentType: response.headers.get("Content-Type") ?? blob.type,
    };
  },

  /**
   * Stream a download to disk. A 403 here is the server's independent re-check
   * of the four download gates, not a UI bug.
   */
  download: async (uuid: string, filename: string): Promise<number> => {
    const response = await request(`/dataroom/documents/${uuid}/download`, { timeoutMs: 180000 });
    if (response.status === 401) clearDataRoomToken();
    if (!response.ok) throw await toApiError(response);

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
  },
};
