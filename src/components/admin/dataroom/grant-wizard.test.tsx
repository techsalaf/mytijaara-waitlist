/**
 * Gate tests for the grant wizard.
 *
 * Three properties are worth locking down, because each failure mode hands the
 * wrong access to the wrong person:
 *
 *  1. "Next" cannot advance past an incomplete step, so a grant with no scope
 *     cannot reach the API and be interpreted generously.
 *  2. Applying a template clears the per-item override maps. A stale
 *     `documentDownload` flag on a deselected id would silently re-grant it,
 *     because the backend treats any id in `document_permissions` as granted.
 *  3. The body handed to `onCreate` matches exactly what the review step read
 *     back. The review step is the operator's last free chance to catch a
 *     mistake, so it must not be describing a different request.
 *
 * The dialog is Radix, so the test setup's pointer-capture and matchMedia stubs
 * are what make `userEvent` work here.
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GrantWizard } from "./grant-wizard";
import type {
  DataRoomAccessTemplate,
  DataRoomAdminDocument,
  DataRoomAdminFolder,
  DataRoomGrantInput,
} from "@/lib/api/dataroom-admin";

const folders: DataRoomAdminFolder[] = [
  {
    id: 10,
    name: "02 Financials & Models",
    slug: "financials-models",
    description: null,
    sortOrder: 20,
    documentsCount: 3,
    publishedDocumentsCount: 2,
  },
  {
    id: 11,
    name: "03 Pitch Deck & Strategy",
    slug: "pitch-deck-strategy",
    description: null,
    sortOrder: 30,
    documentsCount: 1,
    publishedDocumentsCount: 1,
  },
];

function doc(overrides: Partial<DataRoomAdminDocument>): DataRoomAdminDocument {
  return {
    id: 100,
    uuid: "9f1c2b7e-0000-4000-8000-000000000001",
    title: "Financial Model",
    description: null,
    folderId: 10,
    folderName: "02 Financials & Models",
    originalFilename: "financial-model.xlsx",
    fileType: "xlsx",
    fileSize: 2_400_000,
    checksum: null,
    version: "1.0",
    versionsCount: 1,
    status: "published",
    confidentialityLevel: "highly_confidential",
    tags: null,
    sortOrder: 10,
    downloadsPermitted: true,
    startHereOrder: null,
    viewCount: 0,
    downloadCount: 0,
    uploadedBy: null,
    createdAt: null,
    updatedAt: null,
    deletedAt: null,
    ...overrides,
  };
}

const documents: DataRoomAdminDocument[] = [
  doc({}),
  doc({ id: 101, uuid: "…02", title: "Cap Table" }),
  // Neither of these may appear as a selectable option.
  doc({ id: 102, uuid: "…03", title: "Unpublished Draft", status: "draft" }),
  doc({ id: 103, uuid: "…04", title: "Deleted Doc", deletedAt: "2026-08-01T00:00:00Z" }),
];

const templates: DataRoomAccessTemplate[] = [
  {
    id: 5,
    name: "VC Investor",
    description: null,
    allDocumentsAccess: false,
    downloadsPermitted: true,
    defaultDurationDays: 14,
    documentIds: [100],
    folderIds: [10],
    createdBy: null,
    createdAt: null,
  },
];

function setup(onCreate?: ReturnType<typeof vi.fn>) {
  const create = onCreate ?? vi.fn<(body: DataRoomGrantInput) => Promise<void>>();
  if (!onCreate) create.mockResolvedValue(undefined);
  const user = userEvent.setup();
  render(
    <GrantWizard
      open
      onOpenChange={vi.fn()}
      folders={folders}
      documents={documents}
      templates={templates}
      defaultDuration="7d"
      onCreate={create}
    />,
  );
  return { user, onCreate: create };
}

const next = () => screen.getByRole("button", { name: /Next/ });

async function fillVisitor(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Full name"), "Aisha Bello");
  await user.type(screen.getByLabelText("Email address"), "Aisha@Fund.Example");
}

describe("GrantWizard step gating", () => {
  it("blocks Next until the visitor step is clean", async () => {
    const { user } = setup();
    expect(next()).toBeDisabled();
    expect(screen.getByText("Enter the visitor's name.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Full name"), "Aisha Bello");
    expect(next()).toBeDisabled();
    expect(screen.getByText("Enter the visitor's email address.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Email address"), "not-an-email");
    expect(screen.getByText("That does not look like an email address.")).toBeInTheDocument();
    expect(next()).toBeDisabled();

    await user.clear(screen.getByLabelText("Email address"));
    await user.type(screen.getByLabelText("Email address"), "aisha@fund.example");
    expect(next()).toBeEnabled();
  });

  it("blocks Next on the permissions step until something is in scope", async () => {
    const { user } = setup();
    await fillVisitor(user);
    await user.click(next());
    await user.click(next());

    expect(
      screen.getByText("Select at least one category or document, or grant the whole room."),
    ).toBeInTheDocument();
    expect(next()).toBeDisabled();

    await user.click(screen.getByLabelText("Include the category 02 Financials & Models"));
    expect(next()).toBeEnabled();
  });

  it("offers only published, undeleted documents for selection", async () => {
    const { user } = setup();
    await fillVisitor(user);
    await user.click(next());
    await user.click(next());

    expect(screen.getByLabelText("Include the document Financial Model")).toBeInTheDocument();
    expect(screen.getByLabelText("Include the document Cap Table")).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Include the document Unpublished Draft"),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Include the document Deleted Doc")).not.toBeInTheDocument();
  });

  it("hides per-item download switches while the grant is view only", async () => {
    const { user } = setup();
    await fillVisitor(user);
    await user.click(next());
    await user.click(next());
    await user.click(screen.getByLabelText("Include the document Financial Model"));

    expect(screen.queryByLabelText("Allow downloading Financial Model")).not.toBeInTheDocument();
    // Print does not depend on the download switch.
    expect(screen.getByLabelText("Allow printing Financial Model")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Allow downloads for this grant"));
    expect(screen.getByLabelText("Allow downloading Financial Model")).toBeInTheDocument();
  });
});

describe("GrantWizard scope", () => {
  it("sends only the ticked scope, lowercasing the email", async () => {
    const { user, onCreate } = setup();
    await fillVisitor(user);
    await user.click(next());
    await user.click(next());
    await user.click(screen.getByLabelText("Include the document Cap Table"));
    await user.click(next());
    await user.click(screen.getByRole("button", { name: "Create grant" }));

    expect(onCreate).toHaveBeenCalledTimes(1);
    const body = onCreate.mock.calls[0]![0];
    expect(body.visitor_email).toBe("aisha@fund.example");
    expect(body.all_documents_access).toBe(false);
    expect(body.document_ids).toEqual([101]);
    expect(body.folder_ids).toBeUndefined();
    expect(body.document_permissions).toEqual([
      { document_id: 101, can_download: false, can_print: false },
    ]);
  });

  it("sends no document or folder list when the whole room is granted", async () => {
    const { user, onCreate } = setup();
    await fillVisitor(user);
    await user.click(next());
    await user.click(next());
    // Tick a document first, then escalate to the whole room. The narrower lists
    // must not survive: they would outlive a later narrowing of the grant.
    await user.click(screen.getByLabelText("Include the document Financial Model"));
    await user.click(screen.getByLabelText("Grant access to the whole room"));
    await user.click(next());
    await user.click(screen.getByRole("button", { name: "Create grant" }));

    const body = onCreate.mock.calls[0]![0];
    expect(body.all_documents_access).toBe(true);
    expect(body.document_ids).toBeUndefined();
    expect(body.folder_ids).toBeUndefined();
    expect(body.document_permissions).toBeUndefined();
    expect(body.folder_permissions).toBeUndefined();
  });

  it("drops a per-item override when its document is deselected", async () => {
    const { user, onCreate } = setup();
    await fillVisitor(user);
    await user.click(next());
    await user.click(next());
    await user.click(screen.getByLabelText("Allow downloads for this grant"));
    await user.click(screen.getByLabelText("Include the document Financial Model"));
    await user.click(screen.getByLabelText("Allow downloading Financial Model"));
    // Deselect it and grant a different one instead.
    await user.click(screen.getByLabelText("Include the document Financial Model"));
    await user.click(screen.getByLabelText("Include the document Cap Table"));
    await user.click(next());
    await user.click(screen.getByRole("button", { name: "Create grant" }));

    const body = onCreate.mock.calls[0]![0];
    expect(body.document_ids).toEqual([101]);
    expect(body.document_permissions).toEqual([
      { document_id: 101, can_download: false, can_print: false },
    ]);
  });
});

describe("GrantWizard review step", () => {
  it("reads back the scope the operator selected", async () => {
    const { user } = setup();
    await fillVisitor(user);
    await user.click(next());
    await user.click(next());
    await user.click(screen.getByLabelText("Include the category 02 Financials & Models"));
    await user.click(screen.getByLabelText("Include the document Cap Table"));
    await user.click(next());

    expect(screen.getByText("1 category and 1 document. View only.")).toBeInTheDocument();
    expect(screen.getByText("Category: 02 Financials & Models")).toBeInTheDocument();
    expect(screen.getByText("Document: Cap Table")).toBeInTheDocument();
    // The email is normalized before it is shown, not only before it is sent.
    expect(screen.getByText("aisha@fund.example")).toBeInTheDocument();
    expect(screen.getByText("Unlimited")).toBeInTheDocument();
  });

  it("states that the code is shown once and is not emailed", async () => {
    const { user } = setup();
    await fillVisitor(user);
    await user.click(next());
    await user.click(next());
    await user.click(screen.getByLabelText("Grant access to the whole room"));
    await user.click(next());

    expect(screen.getByText(/shown once on the next screen/)).toBeInTheDocument();
    expect(screen.getByText(/nothing is\s+emailed automatically/)).toBeInTheDocument();
  });

  it("keeps the dialog open and shows the server's reason when creation fails", async () => {
    const onCreate = vi.fn<(body: DataRoomGrantInput) => Promise<void>>();
    onCreate.mockRejectedValue(new Error("A grant already exists for that email address."));
    const { user } = setup(onCreate);
    await fillVisitor(user);
    await user.click(next());
    await user.click(next());
    await user.click(screen.getByLabelText("Grant access to the whole room"));
    await user.click(next());
    await user.click(screen.getByRole("button", { name: "Create grant" }));

    expect(
      await screen.findByText("A grant already exists for that email address."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create grant" })).toBeInTheDocument();
  });
});

describe("GrantWizard progress", () => {
  it("marks the current step for assistive technology", async () => {
    const { user } = setup();
    const progress = screen.getByRole("list", { name: "Wizard progress" });
    expect(within(progress).getByText("Visitor").parentElement).toHaveAttribute(
      "aria-current",
      "step",
    );

    await fillVisitor(user);
    await user.click(next());
    expect(within(progress).getByText("Access window").parentElement).toHaveAttribute(
      "aria-current",
      "step",
    );
  });
});
