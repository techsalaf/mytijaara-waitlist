/**
 * Gate tests for the data room's deterministic helpers.
 *
 * Free, local, no network, no rendering. Every assertion pins a value a
 * component would otherwise compute inline in JSX where nothing could check it.
 *
 * `expiryState` and `formatRelative` are tested at a fixed instant. They take
 * `now` as a parameter for exactly this reason: a test that called `new Date()`
 * would only prove the code works at the moment the suite happened to run, and
 * the 24-hour warning boundary would be untestable.
 */

import { describe, expect, it } from "vitest";
import {
  actionLabel,
  confidentialityLabel,
  downloadFilename,
  expiryState,
  formatBytes,
  formatDateTime,
  formatRelative,
  normalizeAccessCode,
  previewSupportedFor,
} from "./format";

const NOW = new Date("2026-08-27T12:00:00.000Z");

describe("formatBytes", () => {
  it("renders an em dash for absent or nonsense sizes", () => {
    expect(formatBytes(null)).toBe("—");
    expect(formatBytes(undefined)).toBe("—");
    expect(formatBytes(Number.NaN)).toBe("—");
    expect(formatBytes(-1)).toBe("—");
  });

  it("uses binary units and drops decimals on whole bytes", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
  });

  it("shows one decimal below ten and none above", () => {
    expect(formatBytes(2.5 * 1024 ** 2)).toBe("2.5 MB");
    expect(formatBytes(48 * 1024 ** 2)).toBe("48 MB");
  });

  it("caps at terabytes rather than inventing a unit", () => {
    expect(formatBytes(1024 ** 5)).toBe("1024 TB");
  });

  it("formats the 50 MB upload ceiling exactly", () => {
    expect(formatBytes(50 * 1024 * 1024)).toBe("50 MB");
  });
});

describe("normalizeAccessCode", () => {
  it("produces the canonical form from sloppy paste", () => {
    expect(normalizeAccessCode("mtj-8f4k-92qx")).toBe("MTJ-8F4K-92QX");
    expect(normalizeAccessCode("  MTJ 8F4K 92QX  ")).toBe("MTJ-8F4K-92QX");
    expect(normalizeAccessCode("mtj_8f4k_92qx")).toBe("MTJ-8F4K-92QX");
  });

  it("collapses the dashes a mail client substituted", () => {
    // An en dash and an em dash, which is what happens when a code is pasted
    // out of an email body that autoformatted it.
    expect(normalizeAccessCode("mtj–8f4k—92qx")).toBe("MTJ-8F4K-92QX");
  });

  it("collapses runs and trims edge separators", () => {
    expect(normalizeAccessCode("--MTJ---8F4K--92QX--")).toBe("MTJ-8F4K-92QX");
  });

  it("leaves an already canonical code untouched", () => {
    expect(normalizeAccessCode("MTJ-8F4K-92QX")).toBe("MTJ-8F4K-92QX");
  });
});

describe("expiryState", () => {
  it("reports a grant with no expiry as never, not as expired", () => {
    const state = expiryState(null, NOW);
    expect(state.never).toBe(true);
    expect(state.expired).toBe(false);
    expect(state.warning).toBe(false);
    expect(state.label).toBe("No expiry");
  });

  it("treats an unparseable timestamp as unknown rather than as access", () => {
    const state = expiryState("not-a-date", NOW);
    expect(state.label).toBe("—");
    expect(state.expired).toBe(false);
    expect(state.hoursRemaining).toBeNull();
  });

  it("marks a past moment expired", () => {
    const state = expiryState("2026-08-27T11:59:59.000Z", NOW);
    expect(state.expired).toBe(true);
    expect(state.warning).toBe(true);
    expect(state.label).toBe("Expired");
  });

  it("treats the exact expiry instant as expired, not as one second left", () => {
    expect(expiryState(NOW.toISOString(), NOW).expired).toBe(true);
  });

  it("counts minutes inside the final hour", () => {
    const state = expiryState("2026-08-27T12:45:00.000Z", NOW);
    expect(state.hoursRemaining).toBe(0);
    expect(state.warning).toBe(true);
    expect(state.label).toBe("45 min left");
  });

  it("never shows zero minutes left while access is still live", () => {
    const state = expiryState("2026-08-27T12:00:30.000Z", NOW);
    expect(state.expired).toBe(false);
    expect(state.label).toBe("1 min left");
  });

  it("warns inside the final 24 hours", () => {
    const state = expiryState("2026-08-28T06:00:00.000Z", NOW);
    expect(state.warning).toBe(true);
    expect(state.hoursRemaining).toBe(18);
    expect(state.label).toBe("18 hours left");
  });

  it("singularizes one hour", () => {
    expect(expiryState("2026-08-27T13:30:00.000Z", NOW).label).toBe("1 hour left");
  });

  it("does not warn at exactly 24 hours out", () => {
    // The boundary itself: 24 hours remaining is the first non-warning state.
    const state = expiryState("2026-08-28T12:00:00.000Z", NOW);
    expect(state.warning).toBe(false);
    expect(state.label).toBe("1 day left");
  });

  it("warns one minute inside the boundary", () => {
    const state = expiryState("2026-08-28T11:59:00.000Z", NOW);
    expect(state.warning).toBe(true);
    expect(state.label).toBe("23 hours left");
  });

  it("counts whole days beyond the warning window", () => {
    expect(expiryState("2026-09-03T12:00:00.000Z", NOW).label).toBe("7 days left");
    expect(expiryState("2026-09-26T12:00:00.000Z", NOW).label).toBe("30 days left");
  });
});

describe("formatRelative", () => {
  it("renders an em dash for nothing and for garbage", () => {
    expect(formatRelative(null, NOW)).toBe("—");
    expect(formatRelative(undefined, NOW)).toBe("—");
    expect(formatRelative("not-a-date", NOW)).toBe("—");
  });

  it("clamps clock skew from the server to just now", () => {
    expect(formatRelative("2026-08-27T12:05:00.000Z", NOW)).toBe("just now");
  });

  it("steps through minutes, hours and days", () => {
    expect(formatRelative("2026-08-27T11:59:30.000Z", NOW)).toBe("just now");
    expect(formatRelative("2026-08-27T11:45:00.000Z", NOW)).toBe("15 min ago");
    expect(formatRelative("2026-08-27T09:00:00.000Z", NOW)).toBe("3 hours ago");
    expect(formatRelative("2026-08-27T11:00:00.000Z", NOW)).toBe("1 hour ago");
    expect(formatRelative("2026-08-25T12:00:00.000Z", NOW)).toBe("2 days ago");
    expect(formatRelative("2026-08-26T12:00:00.000Z", NOW)).toBe("1 day ago");
  });

  it("falls back to an absolute date past a month", () => {
    const iso = "2026-06-01T12:00:00.000Z";
    expect(formatRelative(iso, NOW)).toBe(formatDateTime(iso));
  });
});

describe("formatDateTime", () => {
  it("renders an em dash for absent and unparseable input", () => {
    expect(formatDateTime(null)).toBe("—");
    expect(formatDateTime(undefined)).toBe("—");
    expect(formatDateTime("")).toBe("—");
    expect(formatDateTime("not-a-date")).toBe("—");
  });

  it("produces a non-empty locale string for a real timestamp", () => {
    // The exact rendering is the runtime's business; that it is not the em dash
    // fallback is ours.
    expect(formatDateTime("2026-08-27T12:00:00.000Z")).not.toBe("—");
  });
});

describe("previewSupportedFor", () => {
  it("accepts the four types the viewer actually renders", () => {
    for (const type of ["pdf", "png", "jpg", "jpeg"]) {
      expect(previewSupportedFor(type)).toBe(true);
    }
  });

  it("is case and leading-dot tolerant", () => {
    expect(previewSupportedFor("PDF")).toBe(true);
    expect(previewSupportedFor(".Jpeg")).toBe(true);
  });

  it("refuses office and archive types instead of faking a viewer", () => {
    for (const type of ["docx", "xlsx", "pptx", "csv", "zip", "txt", "md"]) {
      expect(previewSupportedFor(type)).toBe(false);
    }
  });

  it("refuses absent types", () => {
    expect(previewSupportedFor(null)).toBe(false);
    expect(previewSupportedFor(undefined)).toBe(false);
    expect(previewSupportedFor("")).toBe(false);
  });
});

describe("confidentialityLabel", () => {
  it("maps every level the backend can store", () => {
    expect(confidentialityLabel("public")).toBe("Public");
    expect(confidentialityLabel("internal")).toBe("Internal");
    expect(confidentialityLabel("confidential")).toBe("Confidential");
    expect(confidentialityLabel("highly_confidential")).toBe("Highly confidential");
    expect(confidentialityLabel("restricted")).toBe("Restricted");
  });

  it("defaults an unknown or missing level to Confidential, never to Public", () => {
    // Failing open on a confidentiality label would understate the sensitivity
    // of a document to the reader.
    expect(confidentialityLabel(null)).toBe("Confidential");
    expect(confidentialityLabel(undefined)).toBe("Confidential");
    expect(confidentialityLabel("")).toBe("Confidential");
    expect(confidentialityLabel("something_new")).toBe("Confidential");
  });
});

describe("actionLabel", () => {
  it("renders the logged action names as readable words", () => {
    expect(actionLabel("document_downloaded")).toBe("Downloaded");
    expect(actionLabel("download")).toBe("Downloaded");
    expect(actionLabel("access_denied")).toBe("Access denied");
    expect(actionLabel("acknowledged_confidentiality")).toBe("Acknowledged confidentiality");
  });

  it("humanizes an action it has never seen rather than showing a raw key", () => {
    expect(actionLabel("watermark_applied")).toBe("Watermark applied");
  });
});

describe("downloadFilename", () => {
  it("keeps a plain title and appends the extension", () => {
    expect(downloadFilename("Financial Model", "xlsx")).toBe("Financial Model.xlsx");
  });

  it("strips path separators so a title cannot steer where the browser writes", () => {
    expect(downloadFilename("../../etc/passwd", "pdf")).toBe("etc passwd.pdf");
    expect(downloadFilename("C:\\Windows\\system32", "pdf")).toBe("C Windows system32.pdf");
  });

  it("never starts the name with a dot", () => {
    // A leading dot makes the saved file hidden on unix desktops, and a ".."
    // segment is what a stripped traversal attempt leaves behind.
    expect(downloadFilename(".hidden", "pdf")).toBe("hidden.pdf");
    expect(downloadFilename("..", "pdf")).toBe("document.pdf");
  });

  it("drops quotes and semicolons that would break Content-Disposition", () => {
    expect(downloadFilename('Deck"; drop', "pdf")).toBe("Deck drop.pdf");
  });

  it("falls back to a generic name when nothing survives sanitizing", () => {
    expect(downloadFilename("///", "pdf")).toBe("document.pdf");
    expect(downloadFilename("", "pdf")).toBe("document.pdf");
  });

  it("omits the dot when no file type is known", () => {
    expect(downloadFilename("Cap Table", null)).toBe("Cap Table");
    expect(downloadFilename("Cap Table", "")).toBe("Cap Table");
  });

  it("caps the base length so no filesystem rejects the write", () => {
    const long = "a".repeat(400);
    const out = downloadFilename(long, "pdf");
    expect(out).toBe(`${"a".repeat(120)}.pdf`);
  });
});
