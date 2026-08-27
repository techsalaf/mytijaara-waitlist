/**
 * Deterministic formatting and derivation for the data room UI.
 *
 * Split out of the components because every function here is same-input
 * same-output: byte sizes, expiry windows, code normalization, file-type icons.
 * That makes them gate-testable without rendering anything, and it keeps the
 * components free of arithmetic.
 *
 * Nothing here is a security control. `previewSupportedFor` and
 * `expiryState` describe what to draw; the server re-decides access on every
 * request regardless of what these return.
 */

/** Bytes as a short human string. Binary units, matching the backend's math. */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes)) return "—";
  if (bytes < 0) return "—";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exp;
  const decimals = exp === 0 ? 0 : value < 10 ? 1 : 0;
  return `${value.toFixed(decimals)} ${units[exp]}`;
}

/**
 * Normalize a pasted access code for display and submission.
 *
 * The backend normalizes again before hashing, so this is a courtesy, not the
 * authority: uppercase, en/em dashes and spaces collapsed to hyphens, runs
 * collapsed, edges trimmed. `mtj–8f4k 92qx` becomes `MTJ-8F4K-92QX`.
 */
export function normalizeAccessCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/[‐-―\s_]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type ExpiryState = {
  /** No expiry set on the grant. */
  never: boolean;
  /** The moment has passed. */
  expired: boolean;
  /** Inside the final 24 hours. Drives the warning styling. */
  warning: boolean;
  /** Whole hours remaining, floored. Null when never or already expired. */
  hoursRemaining: number | null;
  /** Short label for the badge. */
  label: string;
};

/**
 * Derive the expiry badge from an ISO timestamp.
 *
 * `now` is a parameter rather than a `Date.now()` call so the behaviour is
 * testable at a fixed instant instead of only at whatever time the suite runs.
 */
export function expiryState(expiresAt: string | null, now: Date = new Date()): ExpiryState {
  if (!expiresAt) {
    return {
      never: true,
      expired: false,
      warning: false,
      hoursRemaining: null,
      label: "No expiry",
    };
  }

  const target = new Date(expiresAt).getTime();
  if (Number.isNaN(target)) {
    return { never: false, expired: false, warning: false, hoursRemaining: null, label: "—" };
  }

  const ms = target - now.getTime();
  if (ms <= 0) {
    return { never: false, expired: true, warning: true, hoursRemaining: null, label: "Expired" };
  }

  const hours = Math.floor(ms / 3_600_000);
  const warning = hours < 24;

  if (hours < 1) {
    const minutes = Math.max(1, Math.floor(ms / 60_000));
    return {
      never: false,
      expired: false,
      warning: true,
      hoursRemaining: 0,
      label: `${minutes} min left`,
    };
  }
  if (hours < 24) {
    return {
      never: false,
      expired: false,
      warning: true,
      hoursRemaining: hours,
      label: `${hours} hour${hours === 1 ? "" : "s"} left`,
    };
  }

  const days = Math.floor(hours / 24);
  return {
    never: false,
    expired: false,
    warning,
    hoursRemaining: hours,
    label: `${days} day${days === 1 ? "" : "s"} left`,
  };
}

/** Absolute date and time in the reader's locale, or an em dash. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Coarse relative time. Deliberately coarse: the audit log carries exact times. */
export function formatRelative(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";

  const seconds = Math.round((now.getTime() - then) / 1000);
  if (seconds < 0) return "just now";
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatDateTime(iso);
}

/**
 * Which file types the in-browser viewer actually renders.
 *
 * Kept in step with `DataRoomWorkspaceController::previewSupported()`. The
 * server sends `previewSupported` on every card and that value wins; this exists
 * for the cases where only a file extension is in hand.
 */
const PREVIEWABLE = new Set(["pdf", "png", "jpg", "jpeg"]);

export function previewSupportedFor(fileType: string | null | undefined): boolean {
  if (!fileType) return false;
  return PREVIEWABLE.has(fileType.toLowerCase().replace(/^\./, ""));
}

/** Confidentiality label as the reader should see it. Metadata, not a permission. */
export function confidentialityLabel(level: string | null | undefined): string {
  switch ((level ?? "").toLowerCase()) {
    case "public":
      return "Public";
    case "internal":
      return "Internal";
    case "confidential":
      return "Confidential";
    case "highly_confidential":
      return "Highly confidential";
    case "restricted":
      return "Restricted";
    default:
      return "Confidential";
  }
}

/** Audit and activity action names as a sentence a visitor can read. */
export function actionLabel(action: string): string {
  const map: Record<string, string> = {
    document_viewed: "Opened",
    document_previewed: "Previewed",
    document_downloaded: "Downloaded",
    view: "Opened",
    preview: "Previewed",
    download: "Downloaded",
    access_denied: "Access denied",
    download_denied: "Download denied",
    authenticated: "Signed in",
    session_started: "Session started",
    session_ended: "Session ended",
    acknowledged_confidentiality: "Acknowledged confidentiality",
  };
  return map[action] ?? action.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

/**
 * A filename for the saved download.
 *
 * The server sets `Content-Disposition`, but the blob path needs a name for the
 * synthetic anchor. Everything outside a safe set is dropped, so a title
 * containing a path separator cannot steer where the browser writes.
 */
export function downloadFilename(title: string, fileType: string | null | undefined): string {
  const base =
    title
      // Anything outside the safe set becomes a space, so a separator cannot
      // survive in any encoding.
      .replace(/[^A-Za-z0-9 ._-]+/g, " ")
      // Then kill dot runs, which is what a stripped `../` leaves behind, and
      // what would otherwise start the name with a hidden-file dot.
      .replace(/\.{2,}/g, " ")
      .replace(/\s+/g, " ")
      .replace(/^[\s.-]+|[\s.-]+$/g, "")
      .slice(0, 120) || "document";
  const ext = (fileType ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return ext ? `${base}.${ext}` : base;
}
