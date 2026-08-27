/**
 * Visitor dashboard.
 *
 * Three reads, one screen: `dashboard()` for the counts and the reading list, and
 * the folder tree the shell already fetched. Nothing here decides access; every
 * card's `accessible` flag came from the server.
 *
 * "Recommended for you" is the accessible set in room order, capped at six. It is
 * not a scored recommendation and does not pretend to be one: there is no
 * behavioural model behind it, and inventing one from view counts would read the
 * visitor's own activity back at them.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, FileText, FolderOpen, Lock, Sparkles, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { dataRoomApi, type DataRoomDashboard } from "@/lib/api/dataroom";
import { Skeleton } from "@/components/ui/skeleton";
import { useDataRoomSession } from "@/components/dataroom/session";
import { useDataRoomFolders } from "@/components/dataroom/shell";
import { AccessExpiryBadge, DocumentCard, FileTypeIcon } from "@/components/dataroom/cards";
import { expiryState } from "@/lib/dataroom/format";

export const Route = createFileRoute("/dataroom/workspace/")({
  component: DashboardPage,
});

function DashboardPage() {
  const { visitor, handleError } = useDataRoomSession();
  const { folders, loading: foldersLoading } = useDataRoomFolders();
  const [data, setData] = useState<DataRoomDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setData(await dataRoomApi.dashboard());
    } catch (caught) {
      handleError(caught);
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  useEffect(() => {
    void load();
  }, [load]);

  const expiry = expiryState(visitor?.expiresAt ?? null);

  const accessible = folders
    .filter((folder) => folder.accessible)
    .flatMap((folder) => folder.documents.filter((doc) => doc.accessible))
    .slice(0, 6);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {visitor?.name ? `Welcome, ${visitor.name}` : "Welcome"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {visitor?.organization
            ? `${visitor.organization}${visitor.role ? ` · ${visitor.role}` : ""}`
            : "Everything below has been shared with you for evaluating this round."}
        </p>
        <div className="mt-3 sm:hidden">
          <AccessExpiryBadge expiresAt={visitor?.expiresAt ?? null} />
        </div>
      </header>

      {/* The 24-hour warning. Informational: expiry is enforced server-side. */}
      {expiry.warning && !expiry.expired && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-[var(--gold)]/40 bg-[var(--gold)]/10 p-4 text-sm"
        >
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-[color-mix(in_oklab,var(--gold)_70%,black)]"
            aria-hidden="true"
          />
          <div>
            <p className="font-medium">Your access ends soon ({expiry.label}).</p>
            <p className="mt-0.5 text-muted-foreground">
              Ask the MyTijaara team for an extension if you need more time. Nothing is deleted;
              your access simply stops.
            </p>
          </div>
        </div>
      )}

      <section aria-label="Overview" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-2xl" />
          ))
        ) : (
          <>
            <Tile
              label="Categories"
              value={data?.categoriesCount ?? 0}
              icon={<FolderOpen className="h-4 w-4" aria-hidden="true" />}
            />
            <Tile
              label="Documents in the room"
              value={data?.totalDocuments ?? 0}
              icon={<FileText className="h-4 w-4" aria-hidden="true" />}
            />
            <Tile
              label="Available to you"
              value={data?.accessibleDocuments ?? 0}
              icon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
              accent
            />
            <Tile
              label="Needs further access"
              value={data?.restrictedDocuments ?? 0}
              icon={<Lock className="h-4 w-4" aria-hidden="true" />}
              hint="Ask us if you need one of these."
            />
          </>
        )}
      </section>

      {!loading && (data?.startHere?.length ?? 0) > 0 && (
        <section aria-labelledby="start-here">
          <h2 id="start-here" className="text-lg font-semibold tracking-tight">
            Start here
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            The shortest path through the round, in order.
          </p>
          <ol className="mt-4 space-y-2">
            {data?.startHere.map((doc, index) => (
              <li key={doc.uuid}>
                <Link
                  to="/dataroom/workspace/documents/$uuid"
                  params={{ uuid: doc.uuid }}
                  className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition-colors hover:border-[var(--primary)]/40 hover:bg-[var(--primary-soft)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--primary-soft)] text-xs font-bold text-[var(--primary)]">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{doc.title}</span>
                    {doc.description && (
                      <span className="block truncate text-sm text-muted-foreground">
                        {doc.description}
                      </span>
                    )}
                  </span>
                  <FileTypeIcon
                    fileType={doc.fileType}
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                  />
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      {accessible.length > 0 && (
        <section aria-labelledby="recommended">
          <h2 id="recommended" className="text-lg font-semibold tracking-tight">
            Recommended for you
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Documents your access covers, in the order the room is organized.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {accessible.map((doc) => (
              <DocumentCard key={doc.uuid} document={doc} />
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="categories" className="space-y-8">
        <div>
          <h2 id="categories" className="text-lg font-semibold tracking-tight">
            All categories
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Every category in the room is listed. Ones you cannot open yet are shown so you know
            what to ask for.
          </p>
        </div>

        {foldersLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Loading the room…
          </div>
        ) : folders.length === 0 ? (
          <p className="rounded-2xl border border-border/60 bg-card p-6 text-sm text-muted-foreground">
            The room is being prepared. There is nothing to read yet.
          </p>
        ) : (
          folders.map((folder) => (
            // The id is the anchor the sidebar links to.
            <div key={folder.id} id={folder.slug} className="scroll-mt-24">
              <div className="mb-3 flex flex-wrap items-baseline gap-2">
                <h3 className="text-base font-semibold">{folder.name}</h3>
                <span className="text-xs text-muted-foreground">
                  {folder.accessible
                    ? `${folder.accessibleCount} of ${folder.documents.length} available to you`
                    : "Additional authorization required"}
                </span>
              </div>

              {folder.accessible && folder.description && (
                <p className="mb-3 max-w-2xl text-sm text-muted-foreground">{folder.description}</p>
              )}

              {folder.documents.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
                  Nothing in this category yet.
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {folder.documents.map((doc) => (
                    <DocumentCard key={doc.uuid} document={doc} />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </section>
    </div>
  );
}

function Tile({
  label,
  value,
  icon,
  hint,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
        <span className={accent ? "text-[var(--primary)]" : undefined}>{icon}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
