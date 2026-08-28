/**
 * Every data room admin tab renders its content once its data arrives.
 *
 * The bug these pin: each data-driven tab built its loading panel as JSX and
 * then branched on the element —
 * `const state = (<LoadState … />); if (state || !res.data) return state;`
 * A JSX element is an object, so that branch was always taken. Five of the six
 * tabs returned the state element unconditionally, `LoadState` rendered null
 * once loading finished, and production painted an empty panel under the tab
 * strip. Nothing caught it: `bits.test.tsx` tests `LoadState` in isolation and
 * no test had ever mounted a tab.
 *
 * So these mount the real route components against a mocked API client and
 * assert on text only the success path can produce. `admin.data-room.guard.test.ts`
 * covers the same failure statically, from the other direction.
 */

import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
  Link: ({ to, children }: { to?: unknown; children?: ReactNode }) => (
    <a href={String(to ?? "#")}>{children}</a>
  ),
  Outlet: () => null,
  useRouterState: ({ select }: { select: (state: unknown) => unknown }) =>
    select({ location: { pathname: "/admin/data-room" } }),
}));

vi.mock("@/lib/api/dataroom-admin", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/dataroom-admin")>();
  return {
    ...actual,
    dataRoomAdminApi: {
      overview: vi.fn(),
      analytics: vi.fn(),
      auditLogs: vi.fn(),
      folders: vi.fn(),
      documents: vi.fn(),
      grants: vi.fn(),
      templates: vi.fn(),
      durations: vi.fn(),
      permissionMatrix: vi.fn(),
      settings: vi.fn(),
    },
  };
});

import { dataRoomAdminApi } from "@/lib/api/dataroom-admin";
import type {
  DataRoomAdminDocument,
  DataRoomAdminFolder,
  DataRoomAdminGrant,
  DataRoomAnalytics,
  DataRoomAuditPage,
  DataRoomOverview,
  DataRoomPermissionMatrix,
  DataRoomPolicySnapshot,
} from "@/lib/api/dataroom-admin";
import { Route as OverviewRoute } from "./admin.data-room.index";
import { Route as DocumentsRoute } from "./admin.data-room.documents";
import { Route as GrantsRoute } from "./admin.data-room.grants";
import { Route as MatrixRoute } from "./admin.data-room.matrix";
import { Route as ActivityRoute } from "./admin.data-room.activity";
import { Route as SettingsRoute } from "./admin.data-room.settings";

/** `apiCall` hands back a `{ data }` envelope; every tab reads `.data`. */
const envelope = <T,>(data: T) => ({ success: true, data }) as never;

const POLICY: DataRoomPolicySnapshot = {
  enabled: true,
  openToVisitors: true,
  globalPinEnabled: false,
  globalPinConfigured: false,
  defaultAccessDurationDays: 14,
  sessionTimeoutMinutes: 30,
  effectiveIdleTimeoutMinutes: 30,
  effectiveAbsoluteTtlMinutes: 480,
  maxFailedAttempts: 5,
  effectiveMaxFailedAttempts: 5,
  downloadsEnabled: true,
  watermarkEnabled: true,
  effectiveWatermarkEnabled: true,
  auditLoggingEnabled: true,
  emergencyLockdown: false,
  environment: {
    enabled: true,
    pinPinnedByEnvironment: false,
    watermarkEnabled: true,
    idleTimeoutCeilingMinutes: 30,
    absoluteTtlMinutes: 480,
    malwareScanning: false,
    storageDisk: "dataroom",
  },
};

const OVERVIEW: DataRoomOverview = {
  documents: { total: 3, published: 2, draft: 1, archived: 0 },
  foldersCount: 5,
  grants: {
    total: 4,
    active: 2,
    pending: 1,
    expired: 1,
    revoked: 0,
    suspended: 0,
    exhausted: 0,
  },
  engagement: { totalViews: 42, totalDownloads: 7, activeSessions: 1, last7Days: 12 },
  storage: { bytes: 2_097_152 },
  policy: POLICY,
};

const FOLDER: DataRoomAdminFolder = {
  id: 2,
  name: "02 Financials & Models",
  slug: "financials-models",
  description: null,
  sortOrder: 20,
  documentsCount: 1,
  publishedDocumentsCount: 1,
};

const DOCUMENT: DataRoomAdminDocument = {
  id: 9,
  uuid: "11111111-2222-3333-4444-555555555555",
  title: "Cap table v1",
  description: null,
  folderId: 2,
  folderName: "02 Financials & Models",
  originalFilename: "cap-table.xlsx",
  fileType: "xlsx",
  fileSize: 51_200,
  checksum: "a".repeat(64),
  version: "1.0",
  versionsCount: 1,
  status: "published",
  confidentialityLevel: "confidential",
  tags: null,
  sortOrder: 10,
  downloadsPermitted: true,
  startHereOrder: 1,
  viewCount: 5,
  downloadCount: 1,
  uploadedBy: "Rasheed",
  createdAt: "2026-08-20T09:00:00Z",
  updatedAt: "2026-08-20T09:00:00Z",
  deletedAt: null,
};

const GRANT: DataRoomAdminGrant = {
  id: 3,
  uuid: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  visitorName: "Amina Bello",
  visitorEmail: "amina@example.com",
  organization: "Sahel Ventures",
  roleTitle: "Investor",
  codeHint: "92QX",
  startsAt: null,
  expiresAt: "2026-09-11T09:00:00Z",
  neverExpires: false,
  maxUses: null,
  currentUses: 2,
  storedStatus: "active",
  status: "active",
  allDocumentsAccess: false,
  downloadsPermitted: true,
  notes: null,
  documents: [
    { id: 9, uuid: DOCUMENT.uuid, title: DOCUMENT.title, canDownload: true, canPrint: false },
  ],
  folders: [],
  sessionsCount: 1,
  createdBy: "Rasheed",
  lastAccessedAt: "2026-08-27T14:00:00Z",
  acknowledgedAt: "2026-08-27T14:00:00Z",
  createdAt: "2026-08-20T09:00:00Z",
};

const MATRIX: DataRoomPermissionMatrix = {
  folders: [{ id: FOLDER.id, name: FOLDER.name }],
  grants: [
    {
      id: GRANT.id,
      visitorName: GRANT.visitorName,
      visitorEmail: GRANT.visitorEmail,
      organization: GRANT.organization,
      status: "active",
      allDocumentsAccess: false,
    },
  ],
  rows: [
    {
      documentId: DOCUMENT.id,
      uuid: DOCUMENT.uuid,
      title: DOCUMENT.title,
      folderId: FOLDER.id,
      status: "published",
      cells: [
        { grantId: GRANT.id, via: "document", canView: true, canDownload: true, canPrint: false },
      ],
    },
  ],
};

const ANALYTICS: DataRoomAnalytics = {
  sinceDays: 30,
  mostViewed: [{ uuid: DOCUMENT.uuid, title: DOCUMENT.title, views: 5, downloads: 1 }],
  visitorEngagement: [
    {
      grantId: GRANT.id,
      visitorName: GRANT.visitorName,
      visitorEmail: GRANT.visitorEmail,
      organization: GRANT.organization,
      interactions: 6,
      downloads: 1,
      distinctDocuments: 2,
      lastActivityAt: "2026-08-27T14:00:00Z",
    },
  ],
  daily: [{ day: "2026-08-27", view: 5, preview: 2, download: 1 }],
};

const AUDIT: DataRoomAuditPage = {
  data: [
    {
      id: 1,
      action: "downloaded_document",
      visitorEmail: GRANT.visitorEmail,
      visitorName: GRANT.visitorName,
      organization: GRANT.organization,
      adminUser: null,
      targetType: "App\\Models\\DataRoomDocument",
      targetId: DOCUMENT.id,
      targetTitle: DOCUMENT.title,
      details: "watermarked",
      ipAddress: "197.210.0.1",
      userAgent: "Mozilla/5.0",
      at: "2026-08-27T14:00:00Z",
    },
  ],
  current_page: 1,
  last_page: 1,
  per_page: 25,
  total: 1,
};

const api = vi.mocked(dataRoomAdminApi);

/** Pull the component off a route the way the router would. */
function componentOf(route: unknown) {
  const Component = (route as { options: { component: () => ReactNode } }).options.component;
  return Component as React.ComponentType;
}

beforeEach(() => {
  api.overview.mockResolvedValue(envelope(OVERVIEW));
  api.folders.mockResolvedValue(envelope([FOLDER]));
  api.documents.mockResolvedValue(envelope([DOCUMENT]));
  api.grants.mockResolvedValue(envelope([GRANT]));
  api.templates.mockResolvedValue(envelope([]));
  api.durations.mockResolvedValue(
    envelope({ options: ["7d", "14d", "never"], default: "14d", defaultDurationDays: 14 }),
  );
  api.permissionMatrix.mockResolvedValue(envelope(MATRIX));
  api.settings.mockResolvedValue(envelope(POLICY));
  api.analytics.mockResolvedValue(envelope(ANALYTICS));
  api.auditLogs.mockResolvedValue(AUDIT as never);
});

describe("the data room admin tabs", () => {
  it("Overview shows the counts and the effective policy", async () => {
    const Overview = componentOf(OverviewRoute);
    render(<Overview />);

    expect(await screen.findByText("Effective policy")).toBeInTheDocument();
    expect(screen.getByText("Published documents")).toBeInTheDocument();
    // A value, not just a label: a shell rendered with no data would still
    // satisfy the label assertions.
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("2.0 MB")).toBeInTheDocument();
  });

  it("Documents lists the folders and the documents", async () => {
    const Documents = componentOf(DocumentsRoute);
    render(<Documents />);

    expect(await screen.findByText("Cap table v1")).toBeInTheDocument();
    expect(screen.getAllByText(/02 Financials & Models/).length).toBeGreaterThan(0);
  });

  it("Access grants lists the grants", async () => {
    const Grants = componentOf(GrantsRoute);
    render(<Grants />);

    // The email shares its element with the organization, so match on part.
    expect(await screen.findByText(/amina@example\.com/)).toBeInTheDocument();
    expect(screen.getByText("Amina Bello")).toBeInTheDocument();
    expect(screen.getByText(/code ends 92QX/)).toBeInTheDocument();
  });

  it("Permission matrix renders a row per document", async () => {
    const Matrix = componentOf(MatrixRoute);
    render(<Matrix />);

    expect(await screen.findByText("Cap table v1")).toBeInTheDocument();
  });

  it("Activity renders the summary and the audit rows", async () => {
    const Activity = componentOf(ActivityRoute);
    render(<Activity />);

    // Once in the most-viewed list, once in the audit row.
    expect((await screen.findAllByText("Cap table v1")).length).toBeGreaterThan(1);
    expect(screen.getAllByText(/Sahel Ventures/).length).toBeGreaterThan(0);
  });

  it("Settings renders the policy form", async () => {
    const Settings = componentOf(SettingsRoute);
    render(<Settings />);

    expect(await screen.findByText("Room policy")).toBeInTheDocument();
    expect(screen.getByText("Data room enabled")).toBeInTheDocument();
  });

  it("shows the permission wall rather than a blank panel on a 403", async () => {
    const { ApiError } = await import("@/lib/api/client");
    api.settings.mockRejectedValue(new ApiError("Forbidden", 403));
    const Settings = componentOf(SettingsRoute);
    render(<Settings />);

    expect(
      await screen.findByText("Your role does not include this permission"),
    ).toBeInTheDocument();
  });

  it("shows the retry panel rather than a blank panel on a 500", async () => {
    const { ApiError } = await import("@/lib/api/client");
    api.overview.mockRejectedValue(new ApiError("Server error", 500));
    const Overview = componentOf(OverviewRoute);
    render(<Overview />);

    expect(await screen.findByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("keeps a tab that is still loading from claiming to be empty", async () => {
    api.permissionMatrix.mockReturnValue(new Promise(() => {}) as never);
    const Matrix = componentOf(MatrixRoute);
    render(<Matrix />);

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Loading the permission matrix"),
    );
  });
});
