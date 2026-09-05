/**
 * Document viewer and metadata panel.
 *
 * Bytes arrive as a blob because the visitor token travels in an `Authorization`
 * header, so there is no URL to point an `<iframe src>` or `<img src>` at. That
 * is the property the whole storage design rests on: no storage URL is ever
 * handed to the browser, only an object URL for bytes already authorized for this
 * session and this document.
 *
 * Object URLs are revoked on unmount and on every uuid change. Skipping that
 * keeps the decrypted bytes alive in the tab for as long as it stays open.
 *
 * Office formats get "Preview unavailable" rather than a converted or embedded
 * approximation. A viewer that pretends to be secure while handing out the
 * original file is worse than no viewer.
 */

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Download, FileWarning, Loader2, Printer, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { dataRoomApi, type DataRoomDocumentDetail } from "@/lib/api/dataroom";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  confidentialityLabel,
  downloadFilename,
  formatBytes,
  formatDateTime,
} from "@/lib/dataroom/format";
import { useDataRoomSession } from "./session";
import { AccessStatusBadge, FileTypeIcon } from "./cards";

/** Render markdown as HTML using a simple, safe parser. */
function renderMarkdown(markdown: string): string {
  // Very lightweight markdown → HTML for .md preview.
  // No external dep, no XSS (we trust server content, but sanitize anyway).
  return markdown
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/^### (.*$)/gm, "<h3>$1</h3>")
    .replace(/^## (.*$)/gm, "<h2>$1</h2>")
    .replace(/^# (.*$)/gm, "<h1>$1</h1>")
    .replace(/^\*\* (.*$)/gm, "<ul><li>$1</li></ul>")
    .replace(/^\- (.*$)/gm, "<ul><li>$1</li></ul>")
    .replace(/^\d+\. (.*$)/gm, "<ol><li>$1</li></ol>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, "<code>$1</code>")
    .replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>");
}

/**
 * Render the preview for one document.
 *
 * `previewSupported` comes from the server. When it is false nothing is fetched
 * at all, so an unsupported type costs no bytes and no audit row.
 */
export function DocumentViewer({ document: doc }: { document: DataRoomDocumentDetail }) {
  const { handleError } = useDataRoomSession();
  const [url, setUrl] = useState<string | null>(null);
  const [contentType, setContentType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Held in a ref as well as state so the cleanup revokes the URL it created,
  // not whatever the last render happened to see.
  const objectUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!doc.previewSupported) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const result = await dataRoomApi.previewBlob(doc.uuid);
        if (cancelled) {
          // Unmounted mid-flight. Revoke immediately; nothing will render it.
          URL.revokeObjectURL(result.url);
          return;
        }
        objectUrl.current = result.url;
        setUrl(result.url);
        setContentType(result.contentType);
      } catch (caught) {
        if (cancelled) return;
        if (handleError(caught)) return;
        setError(
          caught instanceof ApiError
            ? caught.message
            : "This document could not be opened. Please try again.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl.current) {
        URL.revokeObjectURL(objectUrl.current);
        objectUrl.current = null;
      }
      setUrl(null);
    };
  }, [doc.uuid, doc.previewSupported, handleError]);

  if (!doc.previewSupported) {
    return (
      <ViewerFrame>
        <div className="flex flex-col items-center gap-3 p-10 text-center">
          <FileWarning className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="font-medium">Preview unavailable</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              This file type cannot be shown in the browser. Download it if your access permits, or
              ask for a PDF version.
            </p>
          </div>
        </div>
      </ViewerFrame>
    );
  }

  if (loading) {
    return (
      <ViewerFrame>
        <div className="flex flex-col items-center gap-3 p-10 text-center" role="status">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--primary)]" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Preparing your document…</p>
        </div>
      </ViewerFrame>
    );
  }

  if (error) {
    return (
      <ViewerFrame>
        <div className="flex flex-col items-center gap-3 p-10 text-center" role="alert">
          <ShieldAlert className="h-8 w-8 text-destructive" aria-hidden="true" />
          <p className="max-w-sm text-sm text-muted-foreground">{error}</p>
        </div>
      </ViewerFrame>
    );
  }

  if (!url) return <ViewerFrame>{null}</ViewerFrame>;

  const isImage = (contentType ?? "").startsWith("image/");
  const isMarkdown = doc.fileType.toLowerCase() === "md";

  return (
    <ViewerFrame className="p-0">
      {isImage ? (
        <img
          src={url}
          alt={`${doc.title} preview`}
          className="mx-auto max-h-[80vh] w-auto max-w-full rounded-b-2xl object-contain"
        />
      ) : isMarkdown ? (
        <div className="h-[80vh] w-full overflow-y-auto p-6 prose prose-sm max-w-none">
          <MarkdownContent url={url} />
        </div>
      ) : (
        // An object URL, not a storage URL. A PDF is rendered by the browser's
        // own viewer; the bytes are already authorized for this session.
        <iframe
          src={url}
          title={`${doc.title} preview`}
          className="h-[80vh] w-full rounded-b-2xl border-0 bg-muted/20"
        />
      )}
    </ViewerFrame>
  );
}

function ViewerFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "grid min-h-[320px] place-items-center rounded-2xl border border-border/60 bg-card shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Metadata and the download control.
 *
 * The button is drawn from `downloadPermitted`, which is UX only. The server
 * re-checks all four download gates on every request, so a stale button produces
 * a 403 that is surfaced as the server's own message.
 */
export function DocumentMetadataPanel({ document: doc }: { document: DataRoomDocumentDetail }) {
  const { handleError } = useDataRoomSession();
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    setDownloading(true);
    try {
      const bytes = await dataRoomApi.download(doc.uuid, downloadFilename(doc.title, doc.fileType));
      toast.success(`Downloaded ${doc.title} (${formatBytes(bytes)}).`);
    } catch (caught) {
      if (handleError(caught)) return;
      toast.error(
        caught instanceof ApiError
          ? caught.message
          : "This download could not be completed. Please try again.",
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <aside className="space-y-4">
      <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <FileTypeIcon fileType={doc.fileType} className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold leading-snug">{doc.title}</h2>
            <AccessStatusBadge level={doc.confidentialityLevel} className="mt-1.5" />
          </div>
        </div>

        {doc.description && <p className="mt-3 text-sm text-muted-foreground">{doc.description}</p>}

        <dl className="mt-4 space-y-2 border-t border-border/50 pt-4 text-sm">
          <Row label="Category" value={doc.folderName ?? "—"} />
          <Row label="File type" value={doc.fileType.toUpperCase()} />
          <Row label="Size" value={formatBytes(doc.fileSize)} />
          <Row label="Version" value={doc.version ? `v${doc.version}` : "—"} />
          <Row label="Last updated" value={formatDateTime(doc.updatedAt)} />
          <Row label="Confidentiality" value={confidentialityLabel(doc.confidentialityLevel)} />
        </dl>

        <div className="mt-4 space-y-2">
          {doc.downloadPermitted ? (
            <Button className="w-full" onClick={() => void download()} disabled={downloading}>
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              {downloading ? "Preparing download…" : "Download"}
            </Button>
          ) : (
            <div className="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                Downloads are not enabled for this document. You can read it here. Ask for download
                access if you need a copy.
              </span>
            </div>
          )}
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Printer className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Printing follows your download permission and is logged the same way.
          </p>
        </div>
      </div>

      {doc.watermark.length > 0 && (
        <div className="rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold)]/5 p-4 text-xs text-muted-foreground">
          <div className="mb-1 font-semibold uppercase tracking-wider text-[color-mix(in_oklab,var(--gold)_70%,black)]">
            Watermarked to you
          </div>
          {/* Shown so nobody is surprised by their own details on a page they
              forward. Deterrence and traceability, not copy protection. */}
          <ul className="space-y-0.5">
            {doc.watermark.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}

/** Fetch and render markdown content from an object URL. */
function MarkdownContent({ url }: { url: string }) {
  const [html, setHtml] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to load markdown");
        const text = await response.text();
        if (!cancelled) setHtml(renderMarkdown(text));
      } catch {
        if (!cancelled) setHtml("<p className=\"text-destructive\">Could not load markdown content.</p>");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (loading) {
    return <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">Loading…</p></div>;
  }

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
