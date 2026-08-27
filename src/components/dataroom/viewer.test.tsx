/**
 * Gate tests for the viewer and the metadata panel.
 *
 * Two properties matter here and neither is visible by reading the JSX:
 *
 *  1. An unsupported type fetches nothing. If the effect ran anyway it would cost
 *     a request and an audit row for a preview that is never drawn.
 *  2. Every object URL created is revoked. Missing that leaves authorized bytes
 *     alive in the tab for as long as it stays open, which is the one thing the
 *     blob-only storage design exists to avoid.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="#">{children}</a>,
}));

const previewBlob = vi.fn();
const download = vi.fn();
vi.mock("@/lib/api/dataroom", () => ({
  dataRoomApi: {
    previewBlob: (...args: unknown[]) => previewBlob(...args),
    download: (...args: unknown[]) => download(...args),
  },
}));

const handleError = vi.fn(() => false);
vi.mock("./session", () => ({
  useDataRoomSession: () => ({
    visitor: null,
    loading: false,
    refresh: vi.fn(),
    signOut: vi.fn(),
    handleError,
  }),
}));

const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: { error: (m: string) => toastError(m), success: (m: string) => toastSuccess(m) },
}));

import { DocumentViewer, DocumentMetadataPanel } from "./viewer";
import { ApiError } from "@/lib/api/client";
import type { DataRoomDocumentDetail } from "@/lib/api/dataroom";

function detail(overrides: Partial<DataRoomDocumentDetail> = {}): DataRoomDocumentDetail {
  return {
    uuid: "doc-1",
    title: "Pitch Deck",
    description: "The October round deck.",
    fileType: "pdf",
    fileSize: 5_242_880,
    version: "2.0",
    confidentialityLevel: "CONFIDENTIAL",
    accessible: true,
    downloadPermitted: true,
    previewSupported: true,
    folderName: "03 Pitch Deck & Strategy",
    updatedAt: "2026-08-20T10:00:00.000Z",
    watermark: ["investor@example.com", "Viewed 20 Aug 2026"],
    ...overrides,
  };
}

const created: string[] = [];
const revoked: string[] = [];

beforeEach(() => {
  created.length = 0;
  revoked.length = 0;
  let counter = 0;
  URL.createObjectURL = vi.fn(() => {
    const url = `blob:mock/${++counter}`;
    created.push(url);
    return url;
  });
  URL.revokeObjectURL = vi.fn((url: string) => {
    revoked.push(url);
  });
  previewBlob.mockReset();
  download.mockReset();
  handleError.mockReset();
  handleError.mockReturnValue(false);
  toastError.mockReset();
  toastSuccess.mockReset();
});

/** Stand in for `previewBlob`, which hands back an already-created object URL. */
function blobResult(contentType: string) {
  return { url: URL.createObjectURL(new Blob([])), contentType };
}

describe("DocumentViewer, unsupported type", () => {
  it("fetches nothing at all", () => {
    render(<DocumentViewer document={detail({ previewSupported: false, fileType: "xlsx" })} />);

    expect(previewBlob).not.toHaveBeenCalled();
  });

  it("says the preview is unavailable instead of faking one", () => {
    render(<DocumentViewer document={detail({ previewSupported: false, fileType: "xlsx" })} />);

    expect(screen.getByText("Preview unavailable")).toBeInTheDocument();
    expect(document.querySelector("iframe")).toBeNull();
    expect(document.querySelector("img")).toBeNull();
  });
});

describe("DocumentViewer, supported type", () => {
  it("renders a PDF in an iframe pointed at the object URL, never a storage URL", async () => {
    previewBlob.mockResolvedValue(blobResult("application/pdf"));
    render(<DocumentViewer document={detail()} />);

    const frame = await waitFor(() => {
      const found = document.querySelector("iframe");
      expect(found).not.toBeNull();
      return found!;
    });
    expect(frame.getAttribute("src")).toBe(created[0]);
    expect(frame.getAttribute("src")).toMatch(/^blob:/);
  });

  it("renders an image in an img, not an iframe", async () => {
    previewBlob.mockResolvedValue(blobResult("image/png"));
    render(<DocumentViewer document={detail({ fileType: "png" })} />);

    await waitFor(() => expect(document.querySelector("img")).not.toBeNull());
    expect(document.querySelector("iframe")).toBeNull();
  });

  it("revokes the object URL on unmount", async () => {
    previewBlob.mockResolvedValue(blobResult("application/pdf"));
    const { unmount } = render(<DocumentViewer document={detail()} />);

    await waitFor(() => expect(document.querySelector("iframe")).not.toBeNull());
    expect(revoked).not.toContain(created[0]);

    unmount();

    expect(revoked).toContain(created[0]);
  });

  it("revokes the previous URL when the uuid changes", async () => {
    previewBlob.mockImplementation(() => Promise.resolve(blobResult("application/pdf")));
    const { rerender } = render(<DocumentViewer document={detail({ uuid: "doc-1" })} />);
    await waitFor(() => expect(created).toHaveLength(1));

    rerender(<DocumentViewer document={detail({ uuid: "doc-2" })} />);

    await waitFor(() => expect(created).toHaveLength(2));
    expect(revoked).toContain(created[0]);
    expect(revoked).not.toContain(created[1]);
  });

  it("revokes bytes that land after unmount rather than leaking them", async () => {
    let resolve: ((value: { url: string; contentType: string }) => void) | undefined;
    previewBlob.mockReturnValue(
      new Promise<{ url: string; contentType: string }>((r) => {
        resolve = r;
      }),
    );
    const { unmount } = render(<DocumentViewer document={detail()} />);
    unmount();

    resolve!(blobResult("application/pdf"));

    await waitFor(() => expect(revoked).toContain(created[0]));
  });

  it("shows the server's message when the preview is refused", async () => {
    previewBlob.mockRejectedValue(new ApiError("This document is not available to you.", 403));
    render(<DocumentViewer document={detail()} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This document is not available to you.",
    );
  });

  it("hands a dead session to the session provider and draws no error of its own", async () => {
    handleError.mockReturnValue(true);
    previewBlob.mockRejectedValue(new ApiError("Session ended.", 401));
    render(<DocumentViewer document={detail()} />);

    await waitFor(() => expect(handleError).toHaveBeenCalled());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("DocumentMetadataPanel", () => {
  it("draws the download button when the server permitted it", () => {
    render(<DocumentMetadataPanel document={detail({ downloadPermitted: true })} />);

    expect(screen.getByRole("button", { name: /download/i })).toBeInTheDocument();
  });

  it("replaces the button with an explanation when it did not", () => {
    render(<DocumentMetadataPanel document={detail({ downloadPermitted: false })} />);

    expect(screen.queryByRole("button", { name: /download/i })).not.toBeInTheDocument();
    expect(screen.getByText(/downloads are not enabled for this document/i)).toBeInTheDocument();
  });

  it("passes a sanitized filename to the download call", async () => {
    download.mockResolvedValue(1024);
    render(
      <DocumentMetadataPanel document={detail({ title: "../../etc/passwd", fileType: "pdf" })} />,
    );

    await userEvent.click(screen.getByRole("button", { name: /download/i }));

    expect(download).toHaveBeenCalledWith("doc-1", "etc passwd.pdf");
  });

  it("surfaces the server's refusal when a stale button is clicked", async () => {
    download.mockRejectedValue(new ApiError("Downloads are disabled for this data room.", 403));
    render(<DocumentMetadataPanel document={detail()} />);

    await userEvent.click(screen.getByRole("button", { name: /download/i }));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("Downloads are disabled for this data room."),
    );
  });

  it("shows the visitor their own watermark lines", () => {
    render(<DocumentMetadataPanel document={detail()} />);

    expect(screen.getByText("Watermarked to you")).toBeInTheDocument();
    expect(screen.getByText("investor@example.com")).toBeInTheDocument();
  });

  it("names the category and the confidentiality level", () => {
    render(<DocumentMetadataPanel document={detail()} />);

    expect(screen.getByText("03 Pitch Deck & Strategy")).toBeInTheDocument();
    expect(screen.getAllByText("Confidential").length).toBeGreaterThan(0);
  });
});
