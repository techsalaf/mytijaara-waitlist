/**
 * Data room administration API client.
 *
 * The opposite side of the boundary from `./dataroom.ts`. These endpoints sit
 * behind `auth:sanctum` plus a per-endpoint Spatie permission, so they use the
 * ordinary `apiCall` transport and the admin token in
 * `localStorage["mytijaara_api_token"]`. The visitor client deliberately does
 * not, and neither client may ever borrow the other's token:
 *
 *   admin    -> mytijaara_api_token       -> auth:sanctum
 *   visitor  -> mytijaara_dataroom_token  -> DataRoomAuthenticate
 *
 * Permission per call is noted on each group. A 403 here is the backend
 * enforcing that gate, not a UI bug: `admin` is withheld
 * `data-room.manage-settings` and `data-room.delete`.
 *
 * No response in this module carries `file_path`. Admin document previews stream
 * through `/documents/{id}/preview` exactly like the visitor path does, so no
 * storage URL exists on this side either.
 */

import { ApiError, apiCall } from "./client";
import { API_BASE_URL, serverApiBaseUrl } from "./base-url";
import { toQuery } from "./waitlist";

// -- overview ---------------------------------------------------------------

export type DataRoomPolicySnapshot = {
  enabled: boolean;
  openToVisitors: boolean;
  globalPinEnabled: boolean;
  globalPinConfigured: boolean;
  defaultAccessDurationDays: number;
  sessionTimeoutMinutes: number;
  effectiveIdleTimeoutMinutes: number;
  effectiveAbsoluteTtlMinutes: number;
  maxFailedAttempts: number;
  effectiveMaxFailedAttempts: number;
  downloadsEnabled: boolean;
  watermarkEnabled: boolean;
  effectiveWatermarkEnabled: boolean;
  auditLoggingEnabled: boolean;
  emergencyLockdown: boolean;
  /** What `config/dataroom.php` allows. Read-only: the ceiling, not the setting. */
  environment: {
    enabled: boolean;
    pinPinnedByEnvironment: boolean;
    watermarkEnabled: boolean;
    idleTimeoutCeilingMinutes: number;
    absoluteTtlMinutes: number;
    malwareScanning: boolean;
    storageDisk: string;
  };
};

export type DataRoomOverview = {
  documents: { total: number; published: number; draft: number; archived: number };
  foldersCount: number;
  grants: {
    total: number;
    active: number;
    pending: number;
    expired: number;
    revoked: number;
    suspended: number;
    exhausted: number;
  };
  engagement: {
    totalViews: number;
    totalDownloads: number;
    activeSessions: number;
    last7Days: number;
  };
  storage: { bytes: number };
  policy: DataRoomPolicySnapshot;
};

// -- analytics and audit ----------------------------------------------------

export type DataRoomAnalytics = {
  sinceDays: number;
  mostViewed: Array<{ uuid: string; title: string; views: number; downloads: number }>;
  visitorEngagement: Array<{
    grantId: number;
    visitorName: string | null;
    visitorEmail: string;
    organization: string | null;
    interactions: number;
    downloads: number;
    distinctDocuments: number;
    lastActivityAt: string | null;
  }>;
  daily: Array<{ day: string; view: number; preview: number; download: number }>;
};

export type DataRoomAuditRow = {
  id: number;
  action: string;
  visitorEmail: string | null;
  visitorName: string | null;
  organization: string | null;
  adminUser: string | null;
  targetType: string | null;
  targetId: number | null;
  targetTitle: string | null;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  at: string | null;
};

export type DataRoomAuditParams = {
  from?: string;
  to?: string;
  grant_id?: number;
  email?: string;
  organization?: string;
  document_id?: number;
  action?: string;
  /** `failure` selects the four denial actions; `success` excludes them. */
  outcome?: "success" | "failure";
  page?: number;
  per_page?: number;
};

// -- folders ----------------------------------------------------------------

export type DataRoomAdminFolder = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  documentsCount: number;
  publishedDocumentsCount: number;
};

// -- documents --------------------------------------------------------------

export type DataRoomDocumentStatus =
  "draft" | "published" | "archived" | "restricted" | "superseded";

export type DataRoomConfidentiality =
  "public" | "internal" | "confidential" | "highly_confidential" | "restricted";

export type DataRoomAdminDocument = {
  id: number;
  /** What the visitor API addresses. Autoincrement ids stay on this side. */
  uuid: string;
  title: string;
  description: string | null;
  folderId: number | null;
  folderName: string | null;
  originalFilename: string;
  fileType: string;
  fileSize: number;
  checksum: string | null;
  version: string | null;
  versionsCount: number | null;
  status: DataRoomDocumentStatus;
  confidentialityLevel: DataRoomConfidentiality;
  tags: string | null;
  sortOrder: number;
  downloadsPermitted: boolean;
  startHereOrder: number | null;
  viewCount: number;
  downloadCount: number;
  uploadedBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  deletedAt: string | null;
};

export type DataRoomDocumentVersionRow = {
  id: number;
  version: string;
  originalFilename: string;
  fileSize: number;
  checksum: string | null;
  changeNotes: string | null;
  uploadedBy: string | null;
  at: string | null;
};

export type DataRoomAdminDocumentDetail = DataRoomAdminDocument & {
  versions: DataRoomDocumentVersionRow[];
};

export type DataRoomDocumentMetadataPatch = {
  title?: string;
  description?: string | null;
  folder_id?: number | null;
  version?: string | null;
  status?: DataRoomDocumentStatus;
  confidentiality_level?: DataRoomConfidentiality;
  tags?: string | null;
  sort_order?: number | null;
  downloads_permitted?: boolean;
  start_here_order?: number | null;
};

// -- grants -----------------------------------------------------------------

export type DataRoomGrantStatus =
  "pending" | "active" | "expired" | "revoked" | "suspended" | "exhausted";

export type DataRoomGrantDuration =
  "1h" | "6h" | "24h" | "3d" | "7d" | "14d" | "30d" | "custom" | "never";

export type DataRoomAdminGrant = {
  id: number;
  uuid: string;
  visitorName: string | null;
  visitorEmail: string;
  organization: string | null;
  roleTitle: string | null;
  /** Last four characters of the code. The rest is unrecoverable by design. */
  codeHint: string | null;
  startsAt: string | null;
  expiresAt: string | null;
  neverExpires: boolean;
  maxUses: number | null;
  currentUses: number;
  /** The raw column. Authoritative only for `revoked` and `suspended`. */
  storedStatus: DataRoomGrantStatus;
  /** `effectiveStatus()`: the clock and use counter layered over the column. */
  status: DataRoomGrantStatus;
  allDocumentsAccess: boolean;
  downloadsPermitted: boolean;
  notes: string | null;
  documents: Array<{
    id: number;
    uuid: string;
    title: string;
    canDownload: boolean;
    canPrint: boolean;
  }> | null;
  folders: Array<{ id: number; name: string; canDownload: boolean }> | null;
  sessionsCount: number | null;
  createdBy: string | null;
  lastAccessedAt: string | null;
  acknowledgedAt: string | null;
  createdAt: string | null;
};

export type DataRoomGrantDetail = DataRoomAdminGrant & {
  /** Most recent 200 rows for this grant. */
  history: Array<{
    action: string;
    details: string | null;
    targetTitle: string | null;
    ipAddress: string | null;
    at: string | null;
  }>;
  activeSessions: Array<{
    ip_address: string | null;
    user_agent: string | null;
    last_active_at: string | null;
    expires_at: string | null;
    absolute_expires_at: string | null;
  }>;
};

/** Scope inputs shared by create and update. */
export type DataRoomGrantScope = {
  all_documents_access?: boolean;
  downloads_permitted?: boolean;
  document_ids?: number[];
  folder_ids?: number[];
  /** Ids named here count as granted even if absent from `document_ids`. */
  document_permissions?: Array<{
    document_id: number;
    can_download?: boolean;
    can_print?: boolean;
  }>;
  folder_permissions?: Array<{ folder_id: number; can_download?: boolean }>;
};

export type DataRoomGrantInput = DataRoomGrantScope & {
  visitor_name: string;
  /** Immutable after creation: it is half the credential. */
  visitor_email: string;
  organization?: string | null;
  role_title?: string | null;
  template_id?: number | null;
  duration?: DataRoomGrantDuration;
  /** Required when `duration` is `custom`. */
  expires_at?: string | null;
  starts_at?: string | null;
  /** Required true when `duration` is `never`, or the API answers 422. */
  confirm_never_expires?: boolean;
  max_uses?: number | null;
  notes?: string | null;
};

export type DataRoomGrantPatch = DataRoomGrantScope & {
  visitor_name?: string;
  organization?: string | null;
  role_title?: string;
  max_uses?: number | null;
  notes?: string | null;
};

/** The plaintext code exists here and nowhere else. Copy it or reissue. */
export type DataRoomGrantCreated = {
  grant: DataRoomAdminGrant;
  accessCode: string;
};

export type DataRoomGrantRegenerated = DataRoomGrantCreated & {
  sessionsDestroyed: number;
};

export type DataRoomDurationOptions = {
  options: DataRoomGrantDuration[];
  default: string;
  defaultDurationDays: number;
};

// -- permission matrix ------------------------------------------------------

export type DataRoomMatrixCell = {
  grantId: number;
  /** How access arrives: room-wide, a document row, a folder row, or not at all. */
  via: "all" | "document" | "folder" | null;
  canView: boolean;
  canDownload: boolean;
  canPrint: boolean;
};

export type DataRoomPermissionMatrix = {
  folders: Array<{ id: number; name: string }>;
  grants: Array<{
    id: number;
    visitorName: string | null;
    visitorEmail: string;
    organization: string | null;
    status: DataRoomGrantStatus;
    allDocumentsAccess: boolean;
  }>;
  rows: Array<{
    documentId: number;
    uuid: string;
    title: string;
    folderId: number | null;
    status: DataRoomDocumentStatus;
    cells: DataRoomMatrixCell[];
  }>;
};

// -- templates --------------------------------------------------------------

export type DataRoomAccessTemplate = {
  id: number;
  name: string;
  description: string | null;
  allDocumentsAccess: boolean;
  downloadsPermitted: boolean;
  defaultDurationDays: number | null;
  documentIds: number[];
  folderIds: number[];
  createdBy: string | null;
  createdAt: string | null;
};

export type DataRoomTemplateInput = {
  name: string;
  description?: string | null;
  all_documents_access?: boolean;
  downloads_permitted?: boolean;
  default_duration_days?: number | null;
  document_ids?: number[];
  folder_ids?: number[];
};

// -- settings and emergency -------------------------------------------------

export type DataRoomSettingsPatch = {
  enabled?: boolean;
  global_pin_enabled?: boolean;
  /** Plaintext over HTTPS; bcrypt-hashed server-side and never returned. */
  global_pin?: string | null;
  default_access_duration_days?: number;
  session_timeout_minutes?: number;
  max_failed_attempts?: number;
  downloads_enabled?: boolean;
  watermark_enabled?: boolean;
  audit_logging_enabled?: boolean;
};

export type DataRoomEmergencyAction =
  | "lock_room"
  | "unlock_room"
  | "revoke_all_sessions"
  | "disable_all_downloads"
  | "enable_all_downloads"
  | "disable_all_grants";

/**
 * Exactly what the backend compares with `hash_equals` after a trim. Typing it
 * here rather than in a component keeps a mistyped phrase a compile error
 * instead of a 422 the operator has to decode.
 */
export const DATA_ROOM_EMERGENCY_PHRASES: Record<DataRoomEmergencyAction, string> = {
  lock_room: "LOCK DATA ROOM",
  unlock_room: "UNLOCK DATA ROOM",
  revoke_all_sessions: "REVOKE ALL SESSIONS",
  disable_all_downloads: "DISABLE ALL DOWNLOADS",
  enable_all_downloads: "ENABLE ALL DOWNLOADS",
  disable_all_grants: "DISABLE ALL ACCESS GRANTS",
};

export type DataRoomEmergencyResult = {
  /** Present for lock_room, revoke_all_sessions and disable_all_grants. */
  sessionsDestroyed?: number;
  /** Present for disable_all_grants. Suspended, so reversible per grant. */
  grantsSuspended?: number;
  policy: DataRoomPolicySnapshot;
};

// -- internals --------------------------------------------------------------

/**
 * A raw Laravel paginator. `auditLogs` returns the paginator itself rather than
 * a `{data, meta}` envelope, so the page counters are siblings of the rows.
 */
export type DataRoomAuditPage = {
  data: DataRoomAuditRow[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

/**
 * Copy scalar fields onto a FormData. Booleans go as "1"/"0" because PHP's
 * multipart parser sees every value as a string and `"false"` is truthy there,
 * which would silently publish a draft or permit a download.
 */
function appendFields(fd: FormData, fields: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue;
    fd.append(key, typeof value === "boolean" ? (value ? "1" : "0") : String(value));
  }
}

/**
 * Fetch a streamed admin endpoint as an object URL. The admin token has to
 * travel in a header, which rules out pointing an element's `src` at it.
 */
async function fetchBlob(
  endpoint: string,
  timeoutMs: number,
): Promise<{ url: string; contentType: string }> {
  const base = typeof window === "undefined" ? serverApiBaseUrl() : API_BASE_URL;
  if (!base) {
    throw new ApiError("The API is not configured. Set VITE_API_BASE_URL.", 503);
  }

  const headers: Record<string, string> = { Accept: "*/*" };
  let token: string | null = null;
  try {
    token = typeof window === "undefined" ? null : localStorage.getItem("mytijaara_api_token");
  } catch {
    token = null;
  }
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const controller = timeoutMs > 0 ? new AbortController() : undefined;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : undefined;

  let response: Response;
  try {
    response = await fetch(`${base}${endpoint}`, {
      method: "GET",
      headers,
      credentials: "omit",
      signal: controller?.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("The preview timed out. Try again.", 408);
    }
    throw new ApiError("Could not reach the server. Check your connection and try again.", 0);
  } finally {
    if (timer) clearTimeout(timer);
  }

  if (!response.ok) {
    let message = response.statusText || "The preview failed";
    try {
      const payload = (await response.json()) as { message?: string };
      if (payload?.message) message = payload.message;
    } catch {
      // Not JSON. The status text is the best available message.
    }
    throw new ApiError(message, response.status);
  }

  const blob = await response.blob();
  return {
    url: URL.createObjectURL(blob),
    contentType: response.headers.get("Content-Type") ?? blob.type,
  };
}

// -- API --------------------------------------------------------------------

const BASE = "/admin/dataroom";

export const dataRoomAdminApi = {
  // data-room.view
  overview: () => apiCall<DataRoomOverview>(`${BASE}/overview`),

  // data-room.view-activity
  analytics: (days?: number) => apiCall<DataRoomAnalytics>(`${BASE}/analytics${toQuery({ days })}`),
  /**
   * A raw Laravel paginator, not the `{data, meta}` envelope. `.data` is the
   * rows; page counters sit alongside it on the same object.
   */
  auditLogs: (params?: DataRoomAuditParams) =>
    apiCall<DataRoomAuditRow[]>(
      `${BASE}/audit-logs${toQuery(params as Record<string, unknown>)}`,
    ) as Promise<DataRoomAuditPage>,

  // -- folders: read is data-room.view, writes are data-room.manage-documents
  folders: () => apiCall<DataRoomAdminFolder[]>(`${BASE}/folders`),
  createFolder: (body: { name: string; description?: string | null; sort_order?: number }) =>
    apiCall<DataRoomAdminFolder>(`${BASE}/folders`, { method: "POST", body }),
  updateFolder: (
    id: number,
    body: { name?: string; description?: string | null; sort_order?: number },
  ) => apiCall<DataRoomAdminFolder>(`${BASE}/folders/${id}`, { method: "PATCH", body }),
  /** 422 while documents remain inside, rather than cascading the delete. */
  deleteFolder: (id: number) =>
    apiCall<{ success: boolean }>(`${BASE}/folders/${id}`, { method: "DELETE" }),
  reorderFolders: (order: Array<{ id: number; sort_order: number }>) =>
    apiCall<{ success: boolean }>(`${BASE}/folders/reorder`, { method: "POST", body: { order } }),

  // -- documents
  documents: () => apiCall<DataRoomAdminDocument[]>(`${BASE}/documents`),
  document: (id: number) => apiCall<DataRoomAdminDocumentDetail>(`${BASE}/documents/${id}`),

  /**
   * data-room.upload. Multipart, so the browser sets the boundary.
   *
   * `meta.malwareScanned` is false when no scanner is provisioned. Surface that
   * rather than hiding it: the pipeline ran, the scan stage did not.
   */
  uploadDocument: (
    file: File,
    fields: { title: string; confidentiality_level: DataRoomConfidentiality } & Omit<
      DataRoomDocumentMetadataPatch,
      "title" | "confidentiality_level"
    >,
  ) => {
    const fd = new FormData();
    fd.append("file", file);
    appendFields(fd, fields as Record<string, unknown>);
    return apiCall<DataRoomAdminDocument>(`${BASE}/documents`, {
      method: "POST",
      formData: fd,
      timeoutMs: 300000, // a 50MB deck on a slow line
    });
  },

  /** Metadata only. Bytes move through `uploadVersion`, never through here. */
  updateDocument: (id: number, patch: DataRoomDocumentMetadataPatch) =>
    apiCall<DataRoomAdminDocument>(`${BASE}/documents/${id}`, { method: "PATCH", body: patch }),

  /** Non-destructive: prior version rows keep pointing at their own bytes. */
  uploadVersion: (
    id: number,
    file: File,
    fields: { version: string; change_notes?: string | null },
  ) => {
    const fd = new FormData();
    fd.append("file", file);
    appendFields(fd, fields as Record<string, unknown>);
    return apiCall<{ id: number; version: string }>(`${BASE}/documents/${id}/versions`, {
      method: "POST",
      formData: fd,
      timeoutMs: 300000,
    });
  },

  /**
   * Streams from the private disk with the admin token in a header, so it
   * cannot be an `<iframe src>`. Callers must revoke the object URL on unmount.
   */
  previewDocumentBlob: (id: number) => fetchBlob(`${BASE}/documents/${id}/preview`, 120000),

  /**
   * data-room.delete. Soft by default; `purge` also destroys the bytes of every
   * version and cannot be undone.
   */
  deleteDocument: (id: number, purge = false) =>
    apiCall<{ success: boolean; purged: boolean }>(
      `${BASE}/documents/${id}${purge ? "?purge=1" : ""}`,
      { method: "DELETE" },
    ),
  restoreDocument: (id: number) =>
    apiCall<DataRoomAdminDocument>(`${BASE}/documents/${id}/restore`, { method: "POST" }),

  // -- grants: all data-room.manage-access
  grants: () => apiCall<DataRoomAdminGrant[]>(`${BASE}/grants`),
  grant: (id: number) => apiCall<DataRoomGrantDetail>(`${BASE}/grants/${id}`),
  durations: () => apiCall<DataRoomDurationOptions>(`${BASE}/grants/durations`),

  /** The response is the only place the plaintext code ever exists. */
  createGrant: (body: DataRoomGrantInput) =>
    apiCall<DataRoomGrantCreated>(`${BASE}/grants`, { method: "POST", body }),
  updateGrant: (id: number, body: DataRoomGrantPatch) =>
    apiCall<DataRoomAdminGrant>(`${BASE}/grants/${id}`, { method: "PATCH", body }),

  /**
   * activate / suspend / revoke. Suspend and revoke destroy live sessions
   * immediately; the count comes back so the UI can say how many. Moving a
   * revoked grant back to active is refused 422 and is not recoverable.
   */
  setGrantStatus: (id: number, status: "active" | "suspended" | "revoked", reason?: string) =>
    apiCall<{ grant: DataRoomAdminGrant; sessionsDestroyed: number }>(
      `${BASE}/grants/${id}/status`,
      { method: "POST", body: { status, reason } },
    ),
  extendGrant: (
    id: number,
    body: {
      duration?: DataRoomGrantDuration;
      expires_at?: string | null;
      confirm_never_expires?: boolean;
    },
  ) => apiCall<DataRoomAdminGrant>(`${BASE}/grants/${id}/extend`, { method: "POST", body }),

  /** New code shown once. The old code and every session opened with it die. */
  regenerateGrant: (id: number) =>
    apiCall<DataRoomGrantRegenerated>(`${BASE}/grants/${id}/regenerate`, { method: "POST" }),
  deleteGrant: (id: number) =>
    apiCall<{ success: boolean }>(`${BASE}/grants/${id}`, { method: "DELETE" }),

  /** Computed from the same pivot rows the authorizer reads, so it cannot drift. */
  permissionMatrix: () => apiCall<DataRoomPermissionMatrix>(`${BASE}/permission-matrix`),

  // -- templates: data-room.manage-access
  templates: () => apiCall<DataRoomAccessTemplate[]>(`${BASE}/templates`),
  createTemplate: (body: DataRoomTemplateInput) =>
    apiCall<DataRoomAccessTemplate>(`${BASE}/templates`, { method: "POST", body }),
  updateTemplate: (id: number, body: Partial<DataRoomTemplateInput>) =>
    apiCall<DataRoomAccessTemplate>(`${BASE}/templates/${id}`, { method: "PATCH", body }),
  /** Safe at any time: issued grants hold their own copy of the lists. */
  deleteTemplate: (id: number) =>
    apiCall<{ success: boolean }>(`${BASE}/templates/${id}`, { method: "DELETE" }),

  // -- settings: read data-room.view, write data-room.manage-settings
  settings: () => apiCall<DataRoomPolicySnapshot>(`${BASE}/settings`),
  updateSettings: (body: DataRoomSettingsPatch) =>
    apiCall<DataRoomPolicySnapshot>(`${BASE}/settings`, { method: "PATCH", body }),

  /**
   * data-room.manage-settings. The confirmation must equal
   * `DATA_ROOM_EMERGENCY_PHRASES[action]` exactly or the backend answers 422,
   * which is what stops a stray click from locking the room.
   */
  emergency: (action: DataRoomEmergencyAction, confirmation: string) =>
    apiCall<DataRoomEmergencyResult>(`${BASE}/emergency`, {
      method: "POST",
      body: { action, confirmation },
    }),
};
