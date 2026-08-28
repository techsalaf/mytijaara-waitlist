/**
 * Deterministic layer for the data room admin UI.
 *
 * Same split as `./format.ts` on the visitor side: everything here is a pure
 * function of its arguments, so it is pinned by tests rather than by reading the
 * JSX. Nothing here is a security control. Two of these functions look like one
 * and are not:
 *
 *  - `emergencyPhraseMatches` decides whether to enable a button. The backend
 *    re-compares the phrase with `hash_equals` and answers 422 on a mismatch, so
 *    a wrong answer here costs a confusing button state, not a locked room.
 *  - `wizardStepIssues` decides whether "Next" is enabled. The backend validates
 *    the same rules again and answers 422. This exists so the operator sees the
 *    problem next to the field instead of after a round trip.
 *
 * The one function that carries real weight is `grantInputFromDraft`: it decides
 * what scope is sent. Sending a wider scope than the operator selected would
 * grant access nobody asked for, so its shape is tested case by case.
 */

import type {
  DataRoomAdminGrant,
  DataRoomAuditParams,
  DataRoomConfidentiality,
  DataRoomDocumentStatus,
  DataRoomEmergencyAction,
  DataRoomGrantDuration,
  DataRoomGrantInput,
  DataRoomGrantStatus,
  DataRoomMatrixCell,
} from "@/lib/api/dataroom-admin";
import { DATA_ROOM_EMERGENCY_PHRASES } from "@/lib/api/dataroom-admin";

// -- statuses ---------------------------------------------------------------

export type Tone = "neutral" | "good" | "warn" | "bad" | "info";

export type StatusView = { label: string; tone: Tone; explanation: string };

/**
 * How a grant status should read to an operator.
 *
 * An unrecognized status falls through to the same treatment as `suspended`:
 * named, warned about, and never presented as working access. Failing open to
 * "Active" on a status this build has not seen would be the one wrong answer.
 */
export function grantStatusView(status: string | null | undefined): StatusView {
  switch ((status ?? "").toLowerCase()) {
    case "active":
      return {
        label: "Active",
        tone: "good",
        explanation: "The visitor can sign in now.",
      };
    case "pending":
      return {
        label: "Pending",
        tone: "info",
        explanation: "Start date is in the future. Sign-in is refused until then.",
      };
    case "expired":
      return {
        label: "Expired",
        tone: "warn",
        explanation: "Past its expiry. Extend it to restore access.",
      };
    case "exhausted":
      return {
        label: "Exhausted",
        tone: "warn",
        explanation: "Every permitted use has been spent. Raise the limit to restore access.",
      };
    case "suspended":
      return {
        label: "Suspended",
        tone: "warn",
        explanation: "Paused by an administrator. Live sessions were ended. Reversible.",
      };
    case "revoked":
      return {
        label: "Revoked",
        tone: "bad",
        explanation: "Withdrawn permanently. It cannot be moved back to active.",
      };
    default:
      return {
        label: "Not usable",
        tone: "warn",
        explanation: "Unrecognized status. Treated as no access until an administrator looks.",
      };
  }
}

/** Which status transitions the backend will accept from where. */
export function allowedStatusActions(
  status: string | null | undefined,
): Array<"active" | "suspended" | "revoked"> {
  switch ((status ?? "").toLowerCase()) {
    // Revoked is terminal server-side; offering "activate" would only produce a 422.
    case "revoked":
      return [];
    case "suspended":
      return ["active", "revoked"];
    case "active":
      return ["suspended", "revoked"];
    // Pending, expired and exhausted are derived from the clock and the counter,
    // not from the column, so activating is a no-op the backend accepts but the
    // operator would misread as a fix. Extend or raise max uses instead.
    default:
      return ["suspended", "revoked"];
  }
}

export function documentStatusView(status: DataRoomDocumentStatus | string): StatusView {
  switch (status) {
    case "published":
      return { label: "Published", tone: "good", explanation: "Visible to grants that reach it." };
    case "draft":
      return { label: "Draft", tone: "info", explanation: "No visitor can see this yet." };
    case "archived":
      return { label: "Archived", tone: "neutral", explanation: "Withdrawn from the workspace." };
    case "restricted":
      return {
        label: "Restricted",
        tone: "warn",
        explanation: "Hidden from visitors regardless of any grant.",
      };
    case "superseded":
      return {
        label: "Superseded",
        tone: "neutral",
        explanation: "A newer document replaced this one.",
      };
    default:
      return { label: String(status), tone: "warn", explanation: "Unrecognized status." };
  }
}

const CONFIDENTIALITY_LABELS: Record<DataRoomConfidentiality, string> = {
  public: "Public",
  internal: "Internal",
  confidential: "Confidential",
  highly_confidential: "Highly confidential",
  restricted: "Restricted",
};

/** Unknown levels read as Confidential, matching the visitor side. */
export function adminConfidentialityLabel(level: string | null | undefined): string {
  const key = (level ?? "").toLowerCase() as DataRoomConfidentiality;
  return CONFIDENTIALITY_LABELS[key] ?? "Confidential";
}

// -- durations --------------------------------------------------------------

const DURATION_LABELS: Record<DataRoomGrantDuration, string> = {
  "1h": "1 hour",
  "6h": "6 hours",
  "24h": "24 hours",
  "3d": "3 days",
  "7d": "7 days",
  "14d": "14 days",
  "30d": "30 days",
  custom: "Custom date and time",
  never: "Never expires",
};

export function durationLabel(duration: string): string {
  return DURATION_LABELS[duration as DataRoomGrantDuration] ?? duration;
}

/** The two durations that need something extra from the operator. */
export function durationNeedsConfirmation(duration: string): boolean {
  return duration === "never";
}

export function durationNeedsDate(duration: string): boolean {
  return duration === "custom";
}

// -- the grant wizard -------------------------------------------------------

/**
 * Everything the four steps collect. Kept flat and serializable so a draft can
 * be held in one `useState` and validated without touching the DOM.
 */
export type GrantDraft = {
  visitorName: string;
  visitorEmail: string;
  organization: string;
  roleTitle: string;
  templateId: number | null;
  duration: DataRoomGrantDuration;
  /** `datetime-local` value. Only read when duration is `custom`. */
  expiresAtLocal: string;
  startsAtLocal: string;
  confirmNeverExpires: boolean;
  /** Empty string means unlimited, matching an empty number input. */
  maxUses: string;
  notes: string;
  allDocumentsAccess: boolean;
  downloadsPermitted: boolean;
  folderIds: number[];
  documentIds: number[];
  /** Per-document overrides. Only consulted for ids in `documentIds`. */
  documentDownload: Record<number, boolean>;
  documentPrint: Record<number, boolean>;
  folderDownload: Record<number, boolean>;
};

export function emptyGrantDraft(defaultDuration: DataRoomGrantDuration = "7d"): GrantDraft {
  return {
    visitorName: "",
    visitorEmail: "",
    organization: "",
    roleTitle: "",
    templateId: null,
    duration: defaultDuration,
    expiresAtLocal: "",
    startsAtLocal: "",
    confirmNeverExpires: false,
    maxUses: "",
    notes: "",
    allDocumentsAccess: false,
    downloadsPermitted: false,
    folderIds: [],
    documentIds: [],
    documentDownload: {},
    documentPrint: {},
    folderDownload: {},
  };
}

export type WizardStep = 1 | 2 | 3 | 4;

/**
 * Deliberately permissive about the address: one `@`, something on each side, no
 * whitespace. Anything stricter rejects valid addresses, and the backend
 * validates properly anyway.
 */
function looksLikeEmail(value: string): boolean {
  const trimmed = value.trim();
  if (/\s/.test(trimmed)) return false;
  const parts = trimmed.split("@");
  return parts.length === 2 && parts[0].length > 0 && parts[1].includes(".");
}

/**
 * What is still wrong with a step, in the order the operator should fix it.
 * Empty means the step is complete. `now` is a parameter so the custom-date
 * check is testable at a fixed instant.
 */
export function wizardStepIssues(
  step: WizardStep,
  draft: GrantDraft,
  now: Date = new Date(),
): string[] {
  const issues: string[] = [];

  if (step === 1) {
    if (!draft.visitorName.trim()) issues.push("Enter the visitor's name.");
    if (!draft.visitorEmail.trim()) {
      issues.push("Enter the visitor's email address.");
    } else if (!looksLikeEmail(draft.visitorEmail)) {
      issues.push("That does not look like an email address.");
    }
    return issues;
  }

  if (step === 2) {
    if (durationNeedsDate(draft.duration)) {
      if (!draft.expiresAtLocal) {
        issues.push("Pick the exact date and time access should end.");
      } else {
        const target = new Date(draft.expiresAtLocal).getTime();
        if (Number.isNaN(target)) {
          issues.push("That expiry date could not be read.");
        } else if (target <= now.getTime()) {
          issues.push("The expiry must be in the future.");
        }
      }
    }
    if (durationNeedsConfirmation(draft.duration) && !draft.confirmNeverExpires) {
      issues.push("Confirm that this grant should never expire.");
    }
    if (draft.maxUses.trim() !== "") {
      const uses = Number(draft.maxUses);
      if (!Number.isInteger(uses) || uses < 1) {
        issues.push("Maximum uses must be a whole number of 1 or more.");
      }
    }
    if (draft.startsAtLocal && Number.isNaN(new Date(draft.startsAtLocal).getTime())) {
      issues.push("That start date could not be read.");
    }
    return issues;
  }

  if (step === 3) {
    // An empty scope is the dangerous default in both directions: a grant that
    // reaches nothing wastes the visitor's time, and a silent fallback to
    // room-wide would hand over the whole room.
    if (
      !draft.allDocumentsAccess &&
      draft.folderIds.length === 0 &&
      draft.documentIds.length === 0
    ) {
      issues.push("Select at least one category or document, or grant the whole room.");
    }
    return issues;
  }

  return issues;
}

/** Every step must be clean before the wizard will submit. */
export function wizardBlockingIssues(draft: GrantDraft, now: Date = new Date()): string[] {
  return [1, 2, 3].flatMap((step) => wizardStepIssues(step as WizardStep, draft, now));
}

/**
 * Turn a draft into the request body.
 *
 * Two rules that matter:
 *
 *  - When `allDocumentsAccess` is set, no folder or document list is sent at
 *    all. Sending both would leave rows behind that survive a later narrowing
 *    of the grant.
 *  - Per-document and per-folder permission rows are emitted only for ids that
 *    are actually selected. The backend treats an id named in
 *    `document_permissions` as granted, so a stale override for a deselected
 *    document would silently re-grant it.
 */
export function grantInputFromDraft(draft: GrantDraft): DataRoomGrantInput {
  const body: DataRoomGrantInput = {
    visitor_name: draft.visitorName.trim(),
    visitor_email: draft.visitorEmail.trim().toLowerCase(),
    duration: draft.duration,
    downloads_permitted: draft.downloadsPermitted,
    all_documents_access: draft.allDocumentsAccess,
  };

  const organization = draft.organization.trim();
  if (organization) body.organization = organization;
  const roleTitle = draft.roleTitle.trim();
  if (roleTitle) body.role_title = roleTitle;
  const notes = draft.notes.trim();
  if (notes) body.notes = notes;
  if (draft.templateId != null) body.template_id = draft.templateId;

  if (durationNeedsDate(draft.duration) && draft.expiresAtLocal) {
    body.expires_at = new Date(draft.expiresAtLocal).toISOString();
  }
  if (durationNeedsConfirmation(draft.duration)) {
    body.confirm_never_expires = draft.confirmNeverExpires;
  }
  if (draft.startsAtLocal) {
    body.starts_at = new Date(draft.startsAtLocal).toISOString();
  }
  if (draft.maxUses.trim() !== "") {
    body.max_uses = Number(draft.maxUses);
  }

  if (draft.allDocumentsAccess) return body;

  if (draft.folderIds.length) {
    body.folder_ids = [...draft.folderIds];
    body.folder_permissions = draft.folderIds.map((folder_id) => ({
      folder_id,
      can_download: draft.folderDownload[folder_id] === true,
    }));
  }
  if (draft.documentIds.length) {
    body.document_ids = [...draft.documentIds];
    body.document_permissions = draft.documentIds.map((document_id) => ({
      document_id,
      can_download: draft.documentDownload[document_id] === true,
      can_print: draft.documentPrint[document_id] === true,
    }));
  }

  return body;
}

/**
 * One sentence describing what the grant will reach, for the review step.
 *
 * Written from the draft rather than from the server's echo so the operator
 * reads back their own selection before it is created, which is the only point
 * at which a mistake is free to fix.
 */
export function scopeSummary(draft: GrantDraft): string {
  if (draft.allDocumentsAccess) {
    return draft.downloadsPermitted
      ? "Every published document, with downloads."
      : "Every published document, view only.";
  }
  const parts: string[] = [];
  if (draft.folderIds.length) {
    parts.push(`${draft.folderIds.length} categor${draft.folderIds.length === 1 ? "y" : "ies"}`);
  }
  if (draft.documentIds.length) {
    parts.push(`${draft.documentIds.length} document${draft.documentIds.length === 1 ? "" : "s"}`);
  }
  if (!parts.length) return "Nothing selected yet.";
  const downloads = draft.downloadsPermitted
    ? "Downloads allowed where permitted per item."
    : "View only.";
  return `${parts.join(" and ")}. ${downloads}`;
}

// -- permission matrix ------------------------------------------------------

export type MatrixCellView = { label: string; short: string; tone: Tone };

/**
 * How one matrix cell reads. `via` says where the access came from, which is
 * what an operator needs when a grant reaches a document they did not tick: it
 * arrived through the folder or through room-wide access.
 */
export function matrixCellView(cell: DataRoomMatrixCell | null | undefined): MatrixCellView {
  if (!cell || !cell.canView) {
    return { label: "No access", short: "—", tone: "neutral" };
  }
  const source =
    cell.via === "all"
      ? "whole room"
      : cell.via === "folder"
        ? "category"
        : cell.via === "document"
          ? "this document"
          : "unknown source";
  const rights = [cell.canDownload ? "download" : null, cell.canPrint ? "print" : null].filter(
    Boolean,
  );
  const label = rights.length
    ? `View and ${rights.join(" and ")} (via ${source})`
    : `View only (via ${source})`;
  return {
    label,
    short: cell.canDownload ? "V D" : "V",
    tone: cell.canDownload ? "good" : "info",
  };
}

// -- audit filters ----------------------------------------------------------

export type AuditFilters = {
  from: string;
  to: string;
  email: string;
  organization: string;
  action: string;
  outcome: "" | "success" | "failure";
  grantId: string;
  documentId: string;
  page: number;
  perPage: number;
};

export function emptyAuditFilters(): AuditFilters {
  return {
    from: "",
    to: "",
    email: "",
    organization: "",
    action: "",
    outcome: "",
    grantId: "",
    documentId: "",
    page: 1,
    perPage: 50,
  };
}

/**
 * Drop every empty field rather than sending it blank.
 *
 * `toQuery` would serialize `email=""` and the backend would filter on an empty
 * string, returning nothing and reading as "no activity" instead of "no filter".
 */
export function auditParamsFromFilters(filters: AuditFilters): DataRoomAuditParams {
  const params: DataRoomAuditParams = {
    page: Math.max(1, Math.trunc(filters.page) || 1),
    per_page: Math.min(200, Math.max(10, Math.trunc(filters.perPage) || 50)),
  };
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.email.trim()) params.email = filters.email.trim();
  if (filters.organization.trim()) params.organization = filters.organization.trim();
  if (filters.action) params.action = filters.action;
  if (filters.outcome) params.outcome = filters.outcome;

  const grantId = Number(filters.grantId);
  if (filters.grantId.trim() && Number.isInteger(grantId) && grantId > 0) {
    params.grant_id = grantId;
  }
  const documentId = Number(filters.documentId);
  if (filters.documentId.trim() && Number.isInteger(documentId) && documentId > 0) {
    params.document_id = documentId;
  }
  return params;
}

/** True when anything narrows the log, so the UI can offer "Clear filters". */
export function auditFiltersActive(filters: AuditFilters): boolean {
  const params = auditParamsFromFilters(filters);
  return Object.keys(params).some((key) => key !== "page" && key !== "per_page");
}

// -- emergency controls -----------------------------------------------------

/**
 * Whether the typed confirmation matches.
 *
 * Trim only. Not case-insensitive, not whitespace-normalized inside the phrase:
 * the backend compares with `hash_equals` after its own trim, so accepting
 * anything looser here would enable a button the server then refuses.
 */
export function emergencyPhraseMatches(action: DataRoomEmergencyAction, typed: string): boolean {
  return typed.trim() === DATA_ROOM_EMERGENCY_PHRASES[action];
}

export type EmergencyDescriptor = {
  title: string;
  /** What actually changes, in the operator's terms. */
  effect: string;
  /** Whether a single click can be walked back, and how. */
  reversal: string;
  destructive: boolean;
};

export const EMERGENCY_DESCRIPTORS: Record<DataRoomEmergencyAction, EmergencyDescriptor> = {
  lock_room: {
    title: "Lock the entire data room",
    effect:
      "Every live session is destroyed and no visitor can sign in. Grants keep their own status.",
    reversal: "Unlock the room. Visitors sign in again with the codes they already have.",
    destructive: true,
  },
  unlock_room: {
    title: "Unlock the data room",
    effect: "Visitors with an active grant can sign in again.",
    reversal: "Lock the room again.",
    destructive: false,
  },
  revoke_all_sessions: {
    title: "Revoke every active session",
    effect: "Everyone currently signed in is signed out. Grants are untouched.",
    reversal: "Nothing to reverse. Visitors sign in again with their existing codes.",
    destructive: true,
  },
  disable_all_downloads: {
    title: "Disable downloads everywhere",
    effect: "Downloads are refused for every document and every grant. Viewing continues.",
    reversal: "Re-enable downloads. Per-document and per-grant settings are preserved.",
    destructive: true,
  },
  enable_all_downloads: {
    title: "Re-enable downloads",
    effect: "The room-wide block is lifted. Per-document and per-grant rules apply again.",
    reversal: "Disable downloads again.",
    destructive: false,
  },
  disable_all_grants: {
    title: "Suspend every access grant",
    effect: "Every grant is suspended and every live session destroyed. No visitor can sign in.",
    reversal: "Reactivate grants one at a time. There is no bulk undo.",
    destructive: true,
  },
};

// -- documents --------------------------------------------------------------

/**
 * Suggest the next version strings from the current one.
 *
 * Returns the patch bump first because that is the common case. An unparseable
 * or missing version yields the two starting points rather than guessing.
 */
export function suggestNextVersions(current: string | null | undefined): [string, string] {
  const match = /^v?(\d+)\.(\d+)$/.exec((current ?? "").trim());
  if (!match) return ["1.0", "2.0"];
  const major = Number(match[1]);
  const minor = Number(match[2]);
  return [`${major}.${minor + 1}`, `${major + 1}.0`];
}

/** First and last eight characters of a checksum, for a column that must fit. */
export function shortChecksum(checksum: string | null | undefined): string {
  if (!checksum) return "—";
  const value = checksum.trim();
  if (value.length <= 20) return value;
  return `${value.slice(0, 8)}…${value.slice(-8)}`;
}

/** Sequential sort_order rows from a reordered id list, 10 apart to leave gaps. */
export function reorderPayload(ids: number[]): Array<{ id: number; sort_order: number }> {
  return ids.map((id, index) => ({ id, sort_order: (index + 1) * 10 }));
}

/**
 * The grants an operator most likely wants to act on, worst first.
 *
 * Revoked sorts last on purpose: it is terminal, so it is the one status where
 * nothing can be done and attention spent on it is wasted.
 */
const GRANT_ORDER: Record<DataRoomGrantStatus, number> = {
  expired: 0,
  exhausted: 1,
  suspended: 2,
  pending: 3,
  active: 4,
  revoked: 5,
};

export function sortGrantsForOperator(grants: DataRoomAdminGrant[]): DataRoomAdminGrant[] {
  return [...grants].sort((a, b) => {
    const rank = (GRANT_ORDER[a.status] ?? 9) - (GRANT_ORDER[b.status] ?? 9);
    if (rank !== 0) return rank;
    return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
  });
}
