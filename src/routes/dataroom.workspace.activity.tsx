/**
 * The visitor's own activity.
 *
 * Their rows only, scoped server-side to their grant. Shown rather than hidden so
 * the logging is not a surprise: they were told access is logged at sign-in, and
 * this is that record.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Loader2, ScrollText } from "lucide-react";
import { dataRoomApi, type DataRoomActivityRow } from "@/lib/api/dataroom";
import { useDataRoomSession } from "@/components/dataroom/session";
import { DataRoomBreadcrumbs } from "@/components/dataroom/shell";
import { actionLabel, formatDateTime, formatRelative } from "@/lib/dataroom/format";

export const Route = createFileRoute("/dataroom/workspace/activity")({
  component: ActivityPage,
});

function ActivityPage() {
  const { handleError } = useDataRoomSession();
  const [rows, setRows] = useState<DataRoomActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await dataRoomApi.activity());
    } catch (caught) {
      if (handleError(caught)) return;
      setError("Your activity could not be loaded. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <DataRoomBreadcrumbs
        trail={[{ label: "Data room", to: "/dataroom/workspace" }, { label: "My activity" }]}
      />

      <h1 className="text-2xl font-semibold tracking-tight">My activity</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        What has been recorded against your access, most recent first.
      </p>

      <div className="mt-6">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Loading your activity…
          </div>
        ) : error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-border/60 bg-card p-8 text-center shadow-sm">
            <ScrollText className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden="true" />
            <p className="mt-2 font-medium">Nothing recorded yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Open a document and it will appear here.
            </p>
          </div>
        ) : (
          <ol className="relative space-y-4 border-l border-border/60 pl-6">
            {rows.map((row, index) => (
              <li key={`${row.at}-${index}`} className="relative">
                <span
                  className="absolute -left-[27px] top-1.5 h-2.5 w-2.5 rounded-full bg-[var(--primary)]"
                  aria-hidden="true"
                />
                <div className="text-sm font-medium">
                  {actionLabel(row.action)}
                  {row.documentTitle && (
                    <span className="font-normal text-muted-foreground">
                      {" "}
                      · {row.documentTitle}
                    </span>
                  )}
                </div>
                {/* Relative for scanning, absolute in the title for the record. */}
                <div className="text-xs text-muted-foreground" title={formatDateTime(row.at)}>
                  {formatRelative(row.at)}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
