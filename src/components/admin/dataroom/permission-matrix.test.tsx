/**
 * Gate tests for the permission matrix.
 *
 * The matrix is the read-back an operator uses before handing over a code, so the
 * one thing it must never do is render access that is not there. A missing cell and
 * a `canView: false` cell both mean no access and must read identically. The `via`
 * wording is pinned too: it is how an operator answers "why can this grant see a
 * document I never ticked".
 *
 * Every cell also carries a screen-reader label, because "V D" is meaningless
 * without sight of the legend.
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PermissionMatrix } from "./permission-matrix";
import type { DataRoomMatrixCell, DataRoomPermissionMatrix } from "@/lib/api/dataroom-admin";

function cell(overrides: Partial<DataRoomMatrixCell> = {}): DataRoomMatrixCell {
  return {
    grantId: 1,
    via: "document",
    canView: true,
    canDownload: false,
    canPrint: false,
    ...overrides,
  };
}

function matrix(overrides: Partial<DataRoomPermissionMatrix> = {}): DataRoomPermissionMatrix {
  return {
    folders: [{ id: 10, name: "02 Financials & Models" }],
    grants: [
      {
        id: 1,
        visitorName: "Aisha Bello",
        visitorEmail: "aisha@fund.example",
        organization: "Sahel Ventures",
        status: "active",
        allDocumentsAccess: false,
      },
      {
        id: 2,
        visitorName: null,
        visitorEmail: "partner@bank.example",
        organization: null,
        status: "revoked",
        allDocumentsAccess: true,
      },
    ],
    rows: [
      {
        documentId: 100,
        uuid: "9f1c2b7e-0000-4000-8000-000000000001",
        title: "Financial Model",
        folderId: 10,
        status: "published",
        cells: [cell({ grantId: 1, canDownload: true }), cell({ grantId: 2, via: "all" })],
      },
      {
        documentId: 101,
        uuid: "9f1c2b7e-0000-4000-8000-000000000002",
        title: "Cap Table",
        folderId: 10,
        status: "draft",
        cells: [cell({ grantId: 1, canView: false, via: null })],
      },
    ],
    ...overrides,
  };
}

describe("PermissionMatrix", () => {
  it("reads a canView:false cell and a missing cell as no access, identically", () => {
    render(<PermissionMatrix matrix={matrix()} />);
    // Cap Table: grant 1 has an explicit false cell, grant 2 has no cell at all.
    const noAccess = screen.getAllByText("No access");
    expect(noAccess).toHaveLength(2);
  });

  it("names where the access comes from", () => {
    render(<PermissionMatrix matrix={matrix()} />);
    expect(screen.getByText("View and download (via this document)")).toBeInTheDocument();
    expect(screen.getByText("View only (via whole room)")).toBeInTheDocument();
  });

  it("gives every cell a screen-reader label and hides the short form from readers", () => {
    render(<PermissionMatrix matrix={matrix()} />);
    const label = screen.getByText("View and download (via this document)");
    expect(label).toHaveClass("sr-only");
    const short = label.parentElement?.querySelector('[aria-hidden="true"]');
    expect(short).toHaveTextContent("V D");
  });

  it("marks a non-published document as invisible to visitors", () => {
    render(<PermissionMatrix matrix={matrix()} />);
    expect(screen.getByText("not visible to visitors")).toBeInTheDocument();
  });

  it("labels a grant column by email when there is no name, and flags room-wide scope", () => {
    render(<PermissionMatrix matrix={matrix()} />);
    expect(screen.getByRole("columnheader", { name: /partner@bank\.example/ })).toBeInTheDocument();
    expect(screen.getByText("whole room")).toBeInTheDocument();
  });

  it("filters rows by title without touching the grant columns", async () => {
    const user = userEvent.setup();
    render(<PermissionMatrix matrix={matrix()} />);
    await user.type(screen.getByLabelText("Filter documents"), "cap");
    expect(screen.queryByRole("rowheader", { name: /Financial Model/ })).not.toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: /Cap Table/ })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Aisha Bello/ })).toBeInTheDocument();
  });

  it("says so when a filter matches nothing, rather than looking empty", async () => {
    const user = userEvent.setup();
    render(<PermissionMatrix matrix={matrix()} />);
    await user.type(screen.getByLabelText("Filter documents"), "zzz");
    expect(screen.getByText("No document title matches that filter.")).toBeInTheDocument();
  });

  it("refuses to draw a matrix with no grants", () => {
    render(<PermissionMatrix matrix={matrix({ grants: [] })} />);
    expect(screen.getByText("Nothing to compare yet")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
