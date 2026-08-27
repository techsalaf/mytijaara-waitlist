/**
 * Gate tests for the visitor cards.
 *
 * The point of these is not that the markup looks right. It is that an
 * inaccessible document renders with nothing on it that a locked card should not
 * carry: no uuid in an href, no size, no description, and no focusable control.
 * The server is the authority on access, but a card that leaked the description
 * of a document the grant cannot open would leak it regardless of what the server
 * does next.
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// cards.tsx only needs `Link`. Replacing the module avoids standing up a router
// for a presentational test.
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    hash,
    children,
    ...rest
  }: {
    to: string;
    params?: Record<string, string>;
    hash?: string;
    children: React.ReactNode;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    const path = Object.entries(params ?? {}).reduce(
      (acc, [key, value]) => acc.replace(`$${key}`, value),
      to,
    );
    return (
      <a href={hash ? `${path}#${hash}` : path} {...rest}>
        {children}
      </a>
    );
  },
}));

import {
  AccessExpiryBadge,
  AccessStatusBadge,
  DocumentCard,
  FolderCard,
  LockedDocumentCard,
} from "./cards";
import type { DataRoomDocumentCard, DataRoomFolderCard } from "@/lib/api/dataroom";

function doc(overrides: Partial<DataRoomDocumentCard> = {}): DataRoomDocumentCard {
  return {
    uuid: "9f1c2b7e-0000-4000-8000-000000000001",
    title: "Financial Model",
    description: "Five-year projection with the unit economics tab.",
    fileType: "xlsx",
    fileSize: 2_400_000,
    version: "1.2",
    confidentialityLevel: "HIGHLY_CONFIDENTIAL",
    accessible: true,
    downloadPermitted: true,
    previewSupported: false,
    ...overrides,
  };
}

function folder(overrides: Partial<DataRoomFolderCard> = {}): DataRoomFolderCard {
  return {
    id: 2,
    name: "02 Financials & Models",
    slug: "financials-models",
    description: "Model, cap table, historicals.",
    accessible: true,
    accessibleCount: 3,
    documents: [doc(), doc({ uuid: "b", accessible: false })],
    ...overrides,
  };
}

describe("DocumentCard, accessible", () => {
  it("links to the document by uuid", () => {
    render(<DocumentCard document={doc()} />);

    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/dataroom/workspace/documents/9f1c2b7e-0000-4000-8000-000000000001",
    );
  });

  it("is a single focus stop, not a card full of controls", () => {
    render(<DocumentCard document={doc()} />);

    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows the size, version and description", () => {
    render(<DocumentCard document={doc()} />);

    expect(screen.getByText("2.3 MB")).toBeInTheDocument();
    expect(screen.getByText("v1.2")).toBeInTheDocument();
    expect(screen.getByText(/five-year projection/i)).toBeInTheDocument();
  });

  it("advertises download only when the server permitted it", () => {
    const { unmount } = render(<DocumentCard document={doc({ downloadPermitted: true })} />);
    expect(screen.getByText("Download permitted")).toBeInTheDocument();
    unmount();

    render(<DocumentCard document={doc({ downloadPermitted: false })} />);
    expect(screen.queryByText("Download permitted")).not.toBeInTheDocument();
  });

  it("offers a preview only for a type the server said it can preview", () => {
    const { unmount } = render(<DocumentCard document={doc({ previewSupported: true })} />);
    expect(screen.getByText("Preview available")).toBeInTheDocument();
    unmount();

    render(<DocumentCard document={doc({ previewSupported: false })} />);
    expect(screen.getByText("Details")).toBeInTheDocument();
  });
});

describe("DocumentCard, inaccessible", () => {
  it("renders the locked card instead of the linked one", () => {
    render(<DocumentCard document={doc({ accessible: false })} />);

    expect(screen.getByText("Additional authorization required")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("carries no uuid anywhere in the rendered markup", () => {
    const { container } = render(<DocumentCard document={doc({ accessible: false })} />);

    expect(container.innerHTML).not.toContain("9f1c2b7e-0000-4000-8000-000000000001");
  });

  it("withholds the description and the size", () => {
    render(<DocumentCard document={doc({ accessible: false })} />);

    expect(screen.queryByText(/five-year projection/i)).not.toBeInTheDocument();
    expect(screen.queryByText("2.3 MB")).not.toBeInTheDocument();
  });

  it("is not focusable, because there is nothing to activate", () => {
    const { container } = render(<DocumentCard document={doc({ accessible: false })} />);

    expect(container.querySelectorAll("a, button, [tabindex]")).toHaveLength(0);
  });

  it("still names the document and its confidentiality so the visitor can ask for it", () => {
    render(<LockedDocumentCard document={doc({ accessible: false })} />);

    expect(screen.getByText("Financial Model")).toBeInTheDocument();
    expect(screen.getByText("Highly confidential")).toBeInTheDocument();
  });

  it("does not advertise download on a locked card even if the flag says true", () => {
    render(<DocumentCard document={doc({ accessible: false, downloadPermitted: true })} />);

    expect(screen.queryByText("Download permitted")).not.toBeInTheDocument();
  });
});

describe("FolderCard", () => {
  it("links to the category anchor when reachable", () => {
    render(
      <FolderCard
        folder={folder()}
        href={{ to: "/dataroom/workspace", hash: "financials-models" }}
      />,
    );

    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/dataroom/workspace#financials-models",
    );
  });

  it("reports how much of the category this grant reaches", () => {
    render(<FolderCard folder={folder()} href={{ to: "/dataroom/workspace" }} />);

    expect(screen.getByText("3 of 2 documents available to you")).toBeInTheDocument();
  });

  it("withholds the description and the link for an unreachable category", () => {
    render(
      <FolderCard
        folder={folder({ accessible: false })}
        href={{ to: "/dataroom/workspace", hash: "financials-models" }}
      />,
    );

    expect(screen.queryByText(/model, cap table/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Additional authorization required")).toBeInTheDocument();
  });

  it("still names the category, because the shape of the room is not the secret", () => {
    render(<FolderCard folder={folder({ accessible: false })} />);

    expect(screen.getByText("02 Financials & Models")).toBeInTheDocument();
  });
});

describe("AccessExpiryBadge", () => {
  it("labels an expired grant and says so in the accessible name", () => {
    render(<AccessExpiryBadge expiresAt="2020-01-01T00:00:00.000Z" />);

    expect(screen.getByText("Expired")).toBeInTheDocument();
    expect(screen.getByText("Access status:")).toBeInTheDocument();
  });

  it("carries the exact moment in the title, not just the rounded label", () => {
    const expires = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
    render(<AccessExpiryBadge expiresAt={expires} />);

    expect(screen.getByTitle(/^Access expires /)).toBeInTheDocument();
  });

  it("says no expiry rather than rendering an empty badge", () => {
    render(<AccessExpiryBadge expiresAt={null} />);

    expect(screen.getByText("No expiry")).toBeInTheDocument();
    expect(screen.getByTitle("No expiry set")).toBeInTheDocument();
  });
});

describe("AccessStatusBadge", () => {
  it("never fails open to Public on an unknown level", () => {
    render(<AccessStatusBadge level="something-new" />);

    expect(screen.getByText("Confidential")).toBeInTheDocument();
  });

  it("never fails open to Public on a missing level", () => {
    render(<AccessStatusBadge level={null} />);

    expect(screen.getByText("Confidential")).toBeInTheDocument();
  });
});
