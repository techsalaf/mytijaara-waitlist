/**
 * Presentational pieces of the visitor workspace.
 *
 * Every prop here is an affordance. `accessible`, `downloadPermitted` and
 * `previewSupported` come from the server and decide what is drawn; the server
 * re-answers all three on every byte request, so a stale value produces a 403 or
 * a 404 rather than a leak. The padlock is cosmetic.
 */

import { Link } from "@tanstack/react-router";
import {
  FileText,
  FileSpreadsheet,
  FileImage,
  FileArchive,
  File as FileIcon,
  Folder,
  Lock,
  Clock,
  Download,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { confidentialityLabel, expiryState, formatBytes } from "@/lib/dataroom/format";
import type { DataRoomDocumentCard, DataRoomFolderCard } from "@/lib/api/dataroom";

/** File-type glyph. Presentation only; the server decides what a file really is. */
export function FileTypeIcon({ fileType, className }: { fileType: string; className?: string }) {
  const type = (fileType ?? "").toLowerCase().replace(/^\./, "");
  const Icon =
    type === "xlsx" || type === "csv"
      ? FileSpreadsheet
      : type === "png" || type === "jpg" || type === "jpeg"
        ? FileImage
        : type === "zip"
          ? FileArchive
          : type === "pdf" || type === "docx" || type === "pptx" || type === "txt" || type === "md"
            ? FileText
            : FileIcon;
  return <Icon className={className} aria-hidden="true" />;
}

/**
 * Time left on the grant, with the 24-hour warning.
 *
 * Purely informational. Expiry is enforced server-side; this badge going red
 * changes nothing about what the next request is allowed to do.
 */
export function AccessExpiryBadge({
  expiresAt,
  className,
}: {
  expiresAt: string | null;
  className?: string;
}) {
  const state = expiryState(expiresAt);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        state.expired
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : state.warning
            ? "border-[var(--gold)]/40 bg-[var(--gold)]/10 text-[color-mix(in_oklab,var(--gold)_70%,black)]"
            : "border-border/60 bg-muted/50 text-muted-foreground",
        className,
      )}
      // The visible label is short; the title carries the exact moment.
      title={expiresAt ? `Access expires ${new Date(expiresAt).toLocaleString()}` : "No expiry set"}
    >
      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="sr-only">Access status: </span>
      {state.label}
    </span>
  );
}

/** Confidentiality label. Metadata for the reader, never a permission check. */
export function AccessStatusBadge({
  level,
  className,
}: {
  level: string | null | undefined;
  className?: string;
}) {
  const label = confidentialityLabel(level);
  const strong = label === "Highly confidential" || label === "Restricted";
  return (
    <Badge
      variant="secondary"
      className={cn(
        "rounded-full text-[10px] font-semibold uppercase tracking-wider",
        strong
          ? "bg-[var(--gold)]/15 text-[color-mix(in_oklab,var(--gold)_70%,black)]"
          : "bg-[var(--primary-soft)] text-[var(--primary)]",
        className,
      )}
    >
      {label}
    </Badge>
  );
}

const CARD = "rounded-2xl border border-border/60 bg-card shadow-sm transition-colors";

/**
 * A document the visitor can open.
 *
 * The whole card is one link so keyboard users get a single focus stop with a
 * full accessible name, rather than a card whose only reachable control is a
 * small chevron.
 */
export function DocumentCard({ document: doc }: { document: DataRoomDocumentCard }) {
  if (!doc.accessible) return <LockedDocumentCard document={doc} />;

  return (
    <Link
      to="/dataroom/workspace/documents/$uuid"
      params={{ uuid: doc.uuid }}
      className={cn(
        CARD,
        "group flex flex-col gap-3 p-4 hover:border-[var(--primary)]/40 hover:bg-[var(--primary-soft)]/40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
          <FileTypeIcon fileType={doc.fileType} className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold leading-snug text-foreground">{doc.title}</div>
          {doc.description && (
            <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{doc.description}</p>
          )}
        </div>
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium uppercase tracking-wide">{doc.fileType}</span>
        <span aria-hidden="true">·</span>
        <span>{formatBytes(doc.fileSize)}</span>
        {doc.version && (
          <>
            <span aria-hidden="true">·</span>
            <span>v{doc.version}</span>
          </>
        )}
        <AccessStatusBadge level={doc.confidentialityLevel} className="ml-auto" />
      </div>

      <div className="flex items-center gap-3 border-t border-border/50 pt-3 text-xs">
        <span className="inline-flex items-center gap-1 text-[var(--primary)]">
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          {doc.previewSupported ? "Preview available" : "Details"}
        </span>
        {doc.downloadPermitted && (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Download permitted
          </span>
        )}
      </div>
    </Link>
  );
}

/**
 * A document that exists but is outside this grant's scope.
 *
 * Shown rather than hidden so the visitor knows what to ask for. Title,
 * confidentiality level and file type only: no size, no description, no uuid in
 * a link, and no route to the bytes. Not a link and not focusable, because there
 * is nothing to activate.
 */
export function LockedDocumentCard({ document: doc }: { document: DataRoomDocumentCard }) {
  return (
    <div className={cn(CARD, "flex flex-col gap-3 border-dashed bg-muted/30 p-4")}>
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
          <Lock className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold leading-snug text-muted-foreground">
            {doc.title}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground/80">
            Additional authorization required
          </p>
        </div>
      </div>
      <div className="mt-auto flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium uppercase tracking-wide">{doc.fileType}</span>
        <AccessStatusBadge level={doc.confidentialityLevel} className="ml-auto opacity-70" />
      </div>
    </div>
  );
}

/**
 * A category.
 *
 * An inaccessible folder still shows its name and its document count, and
 * nothing else. `accessibleCount` is what the server says this grant can reach
 * inside it.
 */
export function FolderCard({
  folder,
  href,
}: {
  folder: DataRoomFolderCard;
  href?: { to: string; hash?: string };
}) {
  const total = folder.documents.length;
  const body = (
    <>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
            folder.accessible
              ? "bg-[var(--primary-soft)] text-[var(--primary)]"
              : "bg-muted text-muted-foreground",
          )}
        >
          {folder.accessible ? (
            <Folder className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Lock className="h-5 w-5" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold leading-snug">{folder.name}</div>
          {/* Description is withheld for a category this grant cannot reach. */}
          {folder.accessible && folder.description && (
            <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
              {folder.description}
            </p>
          )}
          {!folder.accessible && (
            <p className="mt-0.5 text-sm text-muted-foreground/80">
              Additional authorization required
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 text-xs text-muted-foreground">
        {folder.accessible
          ? `${folder.accessibleCount} of ${total} document${total === 1 ? "" : "s"} available to you`
          : `${total} document${total === 1 ? "" : "s"}`}
      </div>
    </>
  );

  if (!folder.accessible || !href) {
    return <div className={cn(CARD, "border-dashed bg-muted/30 p-4")}>{body}</div>;
  }

  return (
    <Link
      to={href.to}
      hash={href.hash}
      className={cn(
        CARD,
        "block p-4 hover:border-[var(--primary)]/40 hover:bg-[var(--primary-soft)]/40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40",
      )}
    >
      {body}
    </Link>
  );
}
