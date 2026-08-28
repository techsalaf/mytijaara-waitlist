/**
 * Documents down, grants across.
 *
 * The cells come from the same pivot rows the server-side authorizer reads, so
 * this view cannot drift from what a visitor will actually be allowed to do. It is
 * a read of the decision, not a second implementation of it.
 *
 * `via` is the column that earns the table: it says whether a grant reaches a
 * document because it was ticked, because the whole category was granted, or
 * because the grant covers the room. An operator surprised to see access on a row
 * they never selected finds the answer here.
 */

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/admin/ui-bits";
import { StatusPill } from "./bits";
import { cn } from "@/lib/utils";
import { documentStatusView, grantStatusView, matrixCellView } from "@/lib/dataroom/admin-format";
import type { DataRoomPermissionMatrix } from "@/lib/api/dataroom-admin";

const TONE_CELL: Record<string, string> = {
  good: "bg-primary/12 text-primary",
  info: "bg-sky-500/10 text-sky-700",
  neutral: "text-muted-foreground/60",
  warn: "bg-[var(--gold)]/12",
  bad: "bg-destructive/10 text-destructive",
};

export function PermissionMatrix({ matrix }: { matrix: DataRoomPermissionMatrix }) {
  const [filter, setFilter] = useState("");

  const rows = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return matrix.rows;
    return matrix.rows.filter((row) => row.title.toLowerCase().includes(needle));
  }, [matrix.rows, filter]);

  if (!matrix.grants.length || !matrix.rows.length) {
    return (
      <EmptyState
        illustration="chart"
        title="Nothing to compare yet"
        description="The matrix needs at least one document and one access grant before it says anything useful."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="w-full max-w-xs space-y-1.5">
          <Label htmlFor="matrix-filter" className="text-xs">
            Filter documents
          </Label>
          <Input
            id="matrix-filter"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Financial model"
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          V = can view. V D = can also download. Hover a cell for where the access comes from.
        </p>
      </div>

      <div className="max-h-[70vh] overflow-auto rounded-2xl border border-border/60">
        <table className="w-full border-collapse text-xs">
          <caption className="sr-only">
            Documents down the side, access grants across the top. Each cell states what that grant
            may do with that document and where the permission comes from.
          </caption>
          <thead className="sticky top-0 z-10 bg-card">
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-20 min-w-56 border-b border-border/60 bg-card px-3 py-2 text-left font-medium"
              >
                Document
              </th>
              {matrix.grants.map((grant) => (
                <th
                  scope="col"
                  key={grant.id}
                  className="border-b border-l border-border/60 px-2 py-2 text-left align-bottom font-medium"
                >
                  <div className="max-w-32 truncate" title={grant.visitorEmail}>
                    {grant.visitorName ?? grant.visitorEmail}
                  </div>
                  <div className="mt-1">
                    <StatusPill view={grantStatusView(grant.status)} />
                  </div>
                  {grant.allDocumentsAccess && (
                    <div className="mt-1 text-[10px] text-muted-foreground">whole room</div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const statusView = documentStatusView(row.status);
              return (
                <tr key={row.documentId} className="hover:bg-muted/20">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 max-w-64 border-b border-border/50 bg-card px-3 py-2 text-left font-normal"
                  >
                    <div className="truncate font-medium" title={row.title}>
                      {row.title}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <StatusPill view={statusView} />
                      {row.status !== "published" && (
                        <span className="text-[10px] text-muted-foreground">
                          not visible to visitors
                        </span>
                      )}
                    </div>
                  </th>
                  {matrix.grants.map((grant) => {
                    const cell = row.cells.find((item) => item.grantId === grant.id) ?? null;
                    const view = matrixCellView(cell);
                    return (
                      <td
                        key={grant.id}
                        className={cn(
                          "border-b border-l border-border/50 px-2 py-2 text-center font-medium",
                          TONE_CELL[view.tone],
                        )}
                        title={`${grant.visitorEmail}: ${view.label}`}
                      >
                        <span className="sr-only">{view.label}</span>
                        <span aria-hidden="true">{view.short}</span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!rows.length && (
        <p className="text-xs text-muted-foreground">No document title matches that filter.</p>
      )}
    </div>
  );
}
