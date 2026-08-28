/**
 * Gate tests for the admin deterministic layer.
 *
 * The three properties worth pinning, because getting any of them wrong is
 * either a silent over-grant or a control that reads as working when it is not:
 *
 *  1. `grantInputFromDraft` never sends a wider scope than the operator picked,
 *     and never leaves a stale per-document override behind.
 *  2. No status view fails open. An unrecognized grant status must not read as
 *     Active, and an unrecognized confidentiality level must not read as Public.
 *  3. `emergencyPhraseMatches` is exactly as strict as the backend's
 *     `hash_equals` after a trim, so the button state and the server agree.
 */

import { describe, expect, it } from "vitest";
import {
  EMERGENCY_DESCRIPTORS,
  adminConfidentialityLabel,
  allowedStatusActions,
  auditFiltersActive,
  auditParamsFromFilters,
  documentStatusView,
  durationLabel,
  durationNeedsConfirmation,
  durationNeedsDate,
  emergencyPhraseMatches,
  emptyAuditFilters,
  emptyGrantDraft,
  grantInputFromDraft,
  grantStatusView,
  matrixCellView,
  reorderPayload,
  scopeSummary,
  shortChecksum,
  sortGrantsForOperator,
  suggestNextVersions,
  wizardBlockingIssues,
  wizardStepIssues,
  type GrantDraft,
} from "./admin-format";
import { DATA_ROOM_EMERGENCY_PHRASES } from "@/lib/api/dataroom-admin";
import type { DataRoomAdminGrant, DataRoomGrantStatus } from "@/lib/api/dataroom-admin";

function draft(overrides: Partial<GrantDraft> = {}): GrantDraft {
  return {
    ...emptyGrantDraft(),
    visitorName: "Aisha Bello",
    visitorEmail: "aisha@example.com",
    ...overrides,
  };
}

const NOW = new Date("2026-08-27T12:00:00.000Z");

describe("grantStatusView", () => {
  it("names each status the backend can return", () => {
    expect(grantStatusView("active").label).toBe("Active");
    expect(grantStatusView("pending").label).toBe("Pending");
    expect(grantStatusView("expired").label).toBe("Expired");
    expect(grantStatusView("exhausted").label).toBe("Exhausted");
    expect(grantStatusView("suspended").label).toBe("Suspended");
    expect(grantStatusView("revoked").label).toBe("Revoked");
  });

  it("never fails open to Active on an unknown status", () => {
    expect(grantStatusView("something-new").label).toBe("Not usable");
    expect(grantStatusView("something-new").tone).not.toBe("good");
  });

  it("never fails open on a missing status", () => {
    expect(grantStatusView(null).label).toBe("Not usable");
    expect(grantStatusView(undefined).tone).not.toBe("good");
  });

  it("marks only Active as good, so the table cannot suggest working access", () => {
    const good = (
      ["active", "pending", "expired", "exhausted", "suspended", "revoked"] as const
    ).filter((s) => grantStatusView(s).tone === "good");
    expect(good).toEqual(["active"]);
  });

  it("says revoked is permanent, because the backend refuses to undo it", () => {
    expect(grantStatusView("revoked").explanation).toMatch(/cannot be moved back/i);
  });
});

describe("allowedStatusActions", () => {
  it("offers nothing for a revoked grant, since every transition 422s", () => {
    expect(allowedStatusActions("revoked")).toEqual([]);
  });

  it("offers reactivation only from suspended", () => {
    expect(allowedStatusActions("suspended")).toContain("active");
    expect(allowedStatusActions("active")).not.toContain("active");
    expect(allowedStatusActions("expired")).not.toContain("active");
  });

  it("always offers revoke except on an already revoked grant", () => {
    for (const status of ["active", "pending", "expired", "exhausted", "suspended"]) {
      expect(allowedStatusActions(status)).toContain("revoked");
    }
  });
});

describe("documentStatusView and adminConfidentialityLabel", () => {
  it("marks draft as invisible to visitors rather than as a warning", () => {
    expect(documentStatusView("draft").explanation).toMatch(/no visitor can see this/i);
  });

  it("marks restricted as hidden regardless of any grant", () => {
    expect(documentStatusView("restricted").explanation).toMatch(/regardless of any grant/i);
  });

  it("never fails open to Public on an unknown confidentiality level", () => {
    expect(adminConfidentialityLabel("something-new")).toBe("Confidential");
    expect(adminConfidentialityLabel(null)).toBe("Confidential");
    expect(adminConfidentialityLabel("")).toBe("Confidential");
  });

  it("still reads Public when the level really is public", () => {
    expect(adminConfidentialityLabel("public")).toBe("Public");
    expect(adminConfidentialityLabel("HIGHLY_CONFIDENTIAL")).toBe("Highly confidential");
  });
});

describe("durations", () => {
  it("spells out every option the backend accepts", () => {
    expect(durationLabel("1h")).toBe("1 hour");
    expect(durationLabel("30d")).toBe("30 days");
    expect(durationLabel("never")).toBe("Never expires");
  });

  it("returns the raw value for something it does not know", () => {
    expect(durationLabel("99y")).toBe("99y");
  });

  it("asks for confirmation only on never-expires", () => {
    expect(durationNeedsConfirmation("never")).toBe(true);
    expect(durationNeedsConfirmation("30d")).toBe(false);
    expect(durationNeedsDate("custom")).toBe(true);
    expect(durationNeedsDate("never")).toBe(false);
  });
});

describe("wizardStepIssues, step 1", () => {
  it("requires a name and an address", () => {
    const issues = wizardStepIssues(1, draft({ visitorName: "", visitorEmail: "" }), NOW);
    expect(issues).toHaveLength(2);
  });

  it("rejects an address with no domain dot", () => {
    expect(wizardStepIssues(1, draft({ visitorEmail: "aisha@localhost" }), NOW)).toEqual([
      "That does not look like an email address.",
    ]);
  });

  it("rejects an address containing whitespace", () => {
    expect(wizardStepIssues(1, draft({ visitorEmail: "ai sha@example.com" }), NOW)).toHaveLength(1);
  });

  it("passes a normal address", () => {
    expect(wizardStepIssues(1, draft(), NOW)).toEqual([]);
  });
});

describe("wizardStepIssues, step 2", () => {
  it("is clean for a plain preset duration", () => {
    expect(wizardStepIssues(2, draft({ duration: "7d" }), NOW)).toEqual([]);
  });

  it("demands a date for a custom duration", () => {
    expect(wizardStepIssues(2, draft({ duration: "custom" }), NOW)).toEqual([
      "Pick the exact date and time access should end.",
    ]);
  });

  it("refuses a custom expiry in the past", () => {
    const issues = wizardStepIssues(
      2,
      draft({ duration: "custom", expiresAtLocal: "2026-08-26T12:00" }),
      NOW,
    );
    expect(issues).toEqual(["The expiry must be in the future."]);
  });

  it("accepts a custom expiry in the future", () => {
    expect(
      wizardStepIssues(2, draft({ duration: "custom", expiresAtLocal: "2026-09-30T12:00" }), NOW),
    ).toEqual([]);
  });

  it("demands explicit confirmation for never-expires", () => {
    expect(wizardStepIssues(2, draft({ duration: "never" }), NOW)).toEqual([
      "Confirm that this grant should never expire.",
    ]);
    expect(
      wizardStepIssues(2, draft({ duration: "never", confirmNeverExpires: true }), NOW),
    ).toEqual([]);
  });

  it("treats an empty max uses as unlimited rather than as an error", () => {
    expect(wizardStepIssues(2, draft({ maxUses: "" }), NOW)).toEqual([]);
  });

  it("rejects a zero, a negative, or a fractional use limit", () => {
    expect(wizardStepIssues(2, draft({ maxUses: "0" }), NOW)).toHaveLength(1);
    expect(wizardStepIssues(2, draft({ maxUses: "-3" }), NOW)).toHaveLength(1);
    expect(wizardStepIssues(2, draft({ maxUses: "2.5" }), NOW)).toHaveLength(1);
    expect(wizardStepIssues(2, draft({ maxUses: "3" }), NOW)).toEqual([]);
  });
});

describe("wizardStepIssues, step 3", () => {
  it("refuses an empty scope rather than defaulting to the whole room", () => {
    expect(wizardStepIssues(3, draft(), NOW)).toEqual([
      "Select at least one category or document, or grant the whole room.",
    ]);
  });

  it("accepts a single document, which is the single-document grant case", () => {
    expect(wizardStepIssues(3, draft({ documentIds: [7] }), NOW)).toEqual([]);
  });

  it("accepts a folder on its own", () => {
    expect(wizardStepIssues(3, draft({ folderIds: [2] }), NOW)).toEqual([]);
  });

  it("accepts room-wide access with no lists", () => {
    expect(wizardStepIssues(3, draft({ allDocumentsAccess: true }), NOW)).toEqual([]);
  });
});

describe("wizardBlockingIssues", () => {
  it("collects issues from every step, not just the current one", () => {
    const issues = wizardBlockingIssues(
      draft({ visitorEmail: "", duration: "never", allDocumentsAccess: false }),
      NOW,
    );
    expect(issues).toHaveLength(3);
  });

  it("is empty for a complete draft", () => {
    expect(wizardBlockingIssues(draft({ documentIds: [1] }), NOW)).toEqual([]);
  });
});

describe("grantInputFromDraft", () => {
  it("lowercases and trims the address, because it is half the credential", () => {
    const body = grantInputFromDraft(draft({ visitorEmail: "  Aisha@Example.COM " }));
    expect(body.visitor_email).toBe("aisha@example.com");
  });

  it("omits every optional text field left blank rather than sending empty strings", () => {
    const body = grantInputFromDraft(draft({ documentIds: [1] }));
    expect(body).not.toHaveProperty("organization");
    expect(body).not.toHaveProperty("role_title");
    expect(body).not.toHaveProperty("notes");
    expect(body).not.toHaveProperty("template_id");
    expect(body).not.toHaveProperty("max_uses");
  });

  it("sends no folder or document list at all for a room-wide grant", () => {
    const body = grantInputFromDraft(
      draft({ allDocumentsAccess: true, folderIds: [1, 2], documentIds: [9] }),
    );
    expect(body.all_documents_access).toBe(true);
    expect(body).not.toHaveProperty("folder_ids");
    expect(body).not.toHaveProperty("document_ids");
    expect(body).not.toHaveProperty("document_permissions");
    expect(body).not.toHaveProperty("folder_permissions");
  });

  it("emits a permission row only for a selected document", () => {
    const body = grantInputFromDraft(
      draft({
        documentIds: [4],
        // 9 was ticked and then deselected. The override must not survive: the
        // backend treats an id in document_permissions as granted.
        documentDownload: { 4: true, 9: true },
        documentPrint: { 9: true },
      }),
    );
    expect(body.document_ids).toEqual([4]);
    expect(body.document_permissions).toEqual([
      { document_id: 4, can_download: true, can_print: false },
    ]);
  });

  it("defaults a document with no override to view only", () => {
    const body = grantInputFromDraft(draft({ documentIds: [4] }));
    expect(body.document_permissions).toEqual([
      { document_id: 4, can_download: false, can_print: false },
    ]);
  });

  it("emits one folder permission row per selected folder", () => {
    const body = grantInputFromDraft(draft({ folderIds: [2, 3], folderDownload: { 2: true } }));
    expect(body.folder_permissions).toEqual([
      { folder_id: 2, can_download: true },
      { folder_id: 3, can_download: false },
    ]);
  });

  it("copies the id arrays rather than aliasing the draft", () => {
    const source = draft({ documentIds: [1, 2] });
    const body = grantInputFromDraft(source);
    source.documentIds.push(3);
    expect(body.document_ids).toEqual([1, 2]);
  });

  it("sends expires_at only for a custom duration", () => {
    expect(
      grantInputFromDraft(draft({ duration: "7d", expiresAtLocal: "2026-09-30T12:00" })),
    ).not.toHaveProperty("expires_at");
    const custom = grantInputFromDraft(
      draft({ duration: "custom", expiresAtLocal: "2026-09-30T12:00" }),
    );
    expect(custom.expires_at).toMatch(/^2026-09-30T/);
  });

  it("sends the never-expires confirmation only for never, and forwards a false", () => {
    expect(grantInputFromDraft(draft({ duration: "30d" }))).not.toHaveProperty(
      "confirm_never_expires",
    );
    expect(grantInputFromDraft(draft({ duration: "never" })).confirm_never_expires).toBe(false);
    expect(
      grantInputFromDraft(draft({ duration: "never", confirmNeverExpires: true }))
        .confirm_never_expires,
    ).toBe(true);
  });

  it("sends max_uses as a number when one was typed", () => {
    expect(grantInputFromDraft(draft({ maxUses: "3" })).max_uses).toBe(3);
  });

  it("always states downloads_permitted, so an unset switch cannot read as permitted", () => {
    expect(grantInputFromDraft(draft()).downloads_permitted).toBe(false);
  });
});

describe("scopeSummary", () => {
  it("says nothing is selected rather than describing an empty grant as valid", () => {
    expect(scopeSummary(draft())).toBe("Nothing selected yet.");
  });

  it("distinguishes room-wide with and without downloads", () => {
    expect(scopeSummary(draft({ allDocumentsAccess: true }))).toMatch(/view only/i);
    expect(scopeSummary(draft({ allDocumentsAccess: true, downloadsPermitted: true }))).toMatch(
      /with downloads/i,
    );
  });

  it("counts categories and documents, singular and plural", () => {
    expect(scopeSummary(draft({ folderIds: [1], documentIds: [2, 3] }))).toContain(
      "1 category and 2 documents",
    );
    expect(scopeSummary(draft({ folderIds: [1, 2] }))).toContain("2 categories");
  });
});

describe("matrixCellView", () => {
  it("reads as no access for a missing cell", () => {
    expect(matrixCellView(null).label).toBe("No access");
    expect(matrixCellView(undefined).short).toBe("—");
  });

  it("reads as no access when canView is false, whatever the other flags say", () => {
    expect(
      matrixCellView({
        grantId: 1,
        via: "document",
        canView: false,
        canDownload: true,
        canPrint: true,
      }).label,
    ).toBe("No access");
  });

  it("names where the access came from, which is what an unticked row needs", () => {
    expect(
      matrixCellView({
        grantId: 1,
        via: "folder",
        canView: true,
        canDownload: false,
        canPrint: false,
      }).label,
    ).toBe("View only (via category)");
    expect(
      matrixCellView({ grantId: 1, via: "all", canView: true, canDownload: true, canPrint: false })
        .label,
    ).toBe("View and download (via whole room)");
  });

  it("lists both extra rights when both are set", () => {
    expect(
      matrixCellView({
        grantId: 1,
        via: "document",
        canView: true,
        canDownload: true,
        canPrint: true,
      }).label,
    ).toBe("View and download and print (via this document)");
  });
});

describe("auditParamsFromFilters", () => {
  it("sends only the page controls when nothing is filtered", () => {
    expect(auditParamsFromFilters(emptyAuditFilters())).toEqual({ page: 1, per_page: 50 });
  });

  it("drops a blank email instead of filtering on an empty string", () => {
    const params = auditParamsFromFilters({ ...emptyAuditFilters(), email: "   " });
    expect(params).not.toHaveProperty("email");
  });

  it("trims the text filters", () => {
    const params = auditParamsFromFilters({
      ...emptyAuditFilters(),
      email: "  a@b.com ",
      organization: " Sahel ",
    });
    expect(params.email).toBe("a@b.com");
    expect(params.organization).toBe("Sahel");
  });

  it("ignores a non-numeric or non-positive id", () => {
    const params = auditParamsFromFilters({
      ...emptyAuditFilters(),
      grantId: "abc",
      documentId: "0",
    });
    expect(params).not.toHaveProperty("grant_id");
    expect(params).not.toHaveProperty("document_id");
  });

  it("clamps the page size and floors the page", () => {
    expect(auditParamsFromFilters({ ...emptyAuditFilters(), perPage: 5000 }).per_page).toBe(200);
    expect(auditParamsFromFilters({ ...emptyAuditFilters(), perPage: 1 }).per_page).toBe(10);
    expect(auditParamsFromFilters({ ...emptyAuditFilters(), page: 0 }).page).toBe(1);
    expect(auditParamsFromFilters({ ...emptyAuditFilters(), page: -4 }).page).toBe(1);
  });

  it("reports whether anything is actually filtered", () => {
    expect(auditFiltersActive(emptyAuditFilters())).toBe(false);
    expect(auditFiltersActive({ ...emptyAuditFilters(), page: 4, perPage: 100 })).toBe(false);
    expect(auditFiltersActive({ ...emptyAuditFilters(), outcome: "failure" })).toBe(true);
  });
});

describe("emergencyPhraseMatches", () => {
  it("accepts the exact phrase the backend compares", () => {
    for (const action of Object.keys(DATA_ROOM_EMERGENCY_PHRASES) as Array<
      keyof typeof DATA_ROOM_EMERGENCY_PHRASES
    >) {
      expect(emergencyPhraseMatches(action, DATA_ROOM_EMERGENCY_PHRASES[action])).toBe(true);
    }
  });

  it("tolerates surrounding whitespace, matching the backend's trim", () => {
    expect(emergencyPhraseMatches("lock_room", "  LOCK DATA ROOM \n")).toBe(true);
  });

  it("refuses a different case, because hash_equals is not case-insensitive", () => {
    expect(emergencyPhraseMatches("lock_room", "lock data room")).toBe(false);
  });

  it("refuses a phrase for a different action", () => {
    expect(emergencyPhraseMatches("lock_room", "UNLOCK DATA ROOM")).toBe(false);
  });

  it("refuses altered internal spacing", () => {
    expect(emergencyPhraseMatches("lock_room", "LOCK  DATA ROOM")).toBe(false);
    expect(emergencyPhraseMatches("lock_room", "")).toBe(false);
  });

  it("describes the blast radius and the reversal for every action", () => {
    for (const action of Object.keys(DATA_ROOM_EMERGENCY_PHRASES) as Array<
      keyof typeof DATA_ROOM_EMERGENCY_PHRASES
    >) {
      const descriptor = EMERGENCY_DESCRIPTORS[action];
      expect(descriptor.effect.length).toBeGreaterThan(20);
      expect(descriptor.reversal.length).toBeGreaterThan(10);
    }
  });

  it("says plainly that suspending every grant has no bulk undo", () => {
    expect(EMERGENCY_DESCRIPTORS.disable_all_grants.reversal).toMatch(/no bulk undo/i);
  });
});

describe("suggestNextVersions", () => {
  it("offers a minor then a major bump", () => {
    expect(suggestNextVersions("1.2")).toEqual(["1.3", "2.0"]);
    expect(suggestNextVersions("v2.9")).toEqual(["2.10", "3.0"]);
  });

  it("falls back to the starting points rather than guessing", () => {
    expect(suggestNextVersions(null)).toEqual(["1.0", "2.0"]);
    expect(suggestNextVersions("draft-final")).toEqual(["1.0", "2.0"]);
    expect(suggestNextVersions("1.2.3")).toEqual(["1.0", "2.0"]);
  });
});

describe("shortChecksum and reorderPayload", () => {
  it("keeps both ends of a sha-256 so it can be compared by eye", () => {
    const sha = "a".repeat(24) + "b".repeat(40);
    const short = shortChecksum(sha);
    expect(short.startsWith("aaaaaaaa")).toBe(true);
    expect(short.endsWith("bbbbbbbb")).toBe(true);
  });

  it("leaves a short value alone and dashes a missing one", () => {
    expect(shortChecksum("abc123")).toBe("abc123");
    expect(shortChecksum(null)).toBe("—");
  });

  it("numbers a reorder ten apart so a later insert needs no rewrite", () => {
    expect(reorderPayload([5, 3, 9])).toEqual([
      { id: 5, sort_order: 10 },
      { id: 3, sort_order: 20 },
      { id: 9, sort_order: 30 },
    ]);
  });
});

describe("sortGrantsForOperator", () => {
  function grant(status: DataRoomGrantStatus, createdAt = "2026-08-01T00:00:00Z") {
    return { id: 1, status, createdAt } as DataRoomAdminGrant;
  }

  it("puts what needs attention first and terminal revocations last", () => {
    const sorted = sortGrantsForOperator([
      grant("revoked"),
      grant("active"),
      grant("expired"),
      grant("suspended"),
    ]);
    expect(sorted.map((g) => g.status)).toEqual(["expired", "suspended", "active", "revoked"]);
  });

  it("breaks ties with the newest grant first", () => {
    const sorted = sortGrantsForOperator([
      grant("active", "2026-08-01T00:00:00Z"),
      grant("active", "2026-08-20T00:00:00Z"),
    ]);
    expect(sorted[0].createdAt).toBe("2026-08-20T00:00:00Z");
  });

  it("does not mutate the array it was given", () => {
    const input = [grant("revoked"), grant("expired")];
    sortGrantsForOperator(input);
    expect(input[0].status).toBe("revoked");
  });
});
