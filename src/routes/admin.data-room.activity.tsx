/**
 * `/admin/data-room/activity` — analytics plus the audit trail.
 *
 * Two deliberate choices.
 *
 * Engagement is reported as counts and nothing else. No score, no "hot lead", no
 * inferred intent: a visitor who opened the model twelve times may be diligent or
 * may be confused, and the log cannot tell you which.
 *
 * The audit endpoint returns a raw Laravel paginator rather than the `{data,
 * meta}` envelope, so the page counters are siblings of the rows. Filters are
 * applied on submit rather than on keystroke, so typing an email does not fire a
 * request per character.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { Download, Eye, RefreshCw, Search, X } from "lucide-react";
import { SectionCard, StatCard } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadState } from "@/components/admin/dataroom/bits";
import { useResource } from "@/components/admin/dataroom/use-resource";
import { dataRoomAdminApi } from "@/lib/api/dataroom-admin";
import type { DataRoomAuditPage } from "@/lib/api/dataroom-admin";
import {
  auditFiltersActive,
  auditParamsFromFilters,
  emptyAuditFilters,
  type AuditFilters,
} from "@/lib/dataroom/admin-format";
import { actionLabel, formatDateTime } from "@/lib/dataroom/format";

export const Route = createFileRoute("/admin/data-room/activity")({
  component: DataRoomActivityRoute,
});

const WINDOWS = [7, 14, 30, 90] as const;

/** The actions worth filtering by, visitor-facing first, then denials. */
const ACTIONS = [
  "authenticated",
  "authentication_failed",
  "authentication_failed_inactive",
  "viewed_document",
  "previewed_document",
  "downloaded_document",
  "access_denied",
  "download_denied",
  "acknowledged_confidentiality",
  "session_expired",
  "logout",
  "admin_updated_settings",
  "emergency_lockdown",
] as const;

function DataRoomActivityRoute() {
  const [days, setDays] = useState<number>(30);
  const [draft, setDraft] = useState<AuditFilters>(() => emptyAuditFilters());
  const [applied, setApplied] = useState<AuditFilters>(() => emptyAuditFilters());

  const loadAnalytics = useCallback(
    async () => (await dataRoomAdminApi.analytics(days)).data,
    [days],
  );
  const analytics = useResource(loadAnalytics, "Could not load the activity summary.");

  // `applied` only changes when the operator submits or pages, so its identity is
  // a safe dependency: no refetch per keystroke, and no refetch per render.
  const params = useMemo(() => auditParamsFromFilters(applied), [applied]);
  const loadAudit = useCallback(
    async (): Promise<DataRoomAuditPage> => dataRoomAdminApi.auditLogs(params),
    [params],
  );
  const audit = useResource(loadAudit, "Could not load the audit log.");

  const filtersOn = useMemo(() => auditFiltersActive(applied), [applied]);

  function apply(page = 1) {
    setApplied({ ...draft, page });
    setDraft((prev) => ({ ...prev, page }));
  }

  function clear() {
    const fresh = emptyAuditFilters();
    setDraft(fresh);
    setApplied(fresh);
  }

  const analyticsState = (
    <LoadState
      loading={analytics.loading}
      error={analytics.error}
      forbidden={analytics.forbidden}
      onRetry={() => void analytics.reload()}
      label="the activity summary"
    />
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="w-40 space-y-1.5">
          <Label htmlFor="activity-window" className="text-xs">
            Window
          </Label>
          <Select value={String(days)} onValueChange={(value) => setDays(Number(value))}>
            <SelectTrigger id="activity-window">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WINDOWS.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  Last {option} days
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={analytics.refreshing || audit.refreshing}
          onClick={() => {
            void analytics.reload();
            void audit.reload();
          }}
        >
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
          Refresh
        </Button>
      </div>

      {analyticsState}

      {analytics.data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Views in window"
              value={analytics.data.daily.reduce((sum, day) => sum + day.view, 0)}
              icon={Eye}
              hint={`Last ${analytics.data.sinceDays} days`}
            />
            <StatCard
              label="Previews in window"
              value={analytics.data.daily.reduce((sum, day) => sum + day.preview, 0)}
              icon={Search}
            />
            <StatCard
              label="Downloads in window"
              value={analytics.data.daily.reduce((sum, day) => sum + day.download, 0)}
              icon={Download}
            />
            <StatCard
              label="Visitors seen"
              value={analytics.data.visitorEngagement.length}
              hint="Grants with at least one interaction"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard title="Most opened" description="Counts only. Ranked by views.">
              {!analytics.data.mostViewed.length ? (
                <p className="text-sm text-muted-foreground">
                  Nothing has been opened in this window.
                </p>
              ) : (
                <ol className="space-y-2">
                  {analytics.data.mostViewed.map((doc, index) => (
                    <li key={doc.uuid} className="flex items-baseline gap-3 text-sm">
                      <span className="w-5 shrink-0 text-xs text-muted-foreground">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate" title={doc.title}>
                        {doc.title}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {doc.views} views · {doc.downloads} downloads
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </SectionCard>

            <SectionCard
              title="Visitor engagement"
              description="What each visitor did. It does not say what they intend to do."
            >
              {!analytics.data.visitorEngagement.length ? (
                <p className="text-sm text-muted-foreground">No visitor activity in this window.</p>
              ) : (
                <ul className="space-y-2.5">
                  {analytics.data.visitorEngagement.map((visitor) => (
                    <li key={visitor.grantId} className="text-sm">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-medium">
                          {visitor.visitorName ?? visitor.visitorEmail}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(visitor.lastActivityAt)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {visitor.organization ? `${visitor.organization} · ` : ""}
                        {visitor.interactions} interactions across {visitor.distinctDocuments}{" "}
                        documents · {visitor.downloads} downloads
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>
        </>
      )}

      <SectionCard
        title="Audit log"
        description="Read-only. There is no endpoint that edits or deletes a data room audit row, so the trail cannot be groomed through the API."
      >
        <form
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={(event) => {
            event.preventDefault();
            apply(1);
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="audit-from" className="text-xs">
              From
            </Label>
            <Input
              id="audit-from"
              type="date"
              value={draft.from}
              onChange={(e) => setDraft({ ...draft, from: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="audit-to" className="text-xs">
              To
            </Label>
            <Input
              id="audit-to"
              type="date"
              value={draft.to}
              onChange={(e) => setDraft({ ...draft, to: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="audit-email" className="text-xs">
              Visitor email contains
            </Label>
            <Input
              id="audit-email"
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="audit-org" className="text-xs">
              Organization contains
            </Label>
            <Input
              id="audit-org"
              value={draft.organization}
              onChange={(e) => setDraft({ ...draft, organization: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="audit-action" className="text-xs">
              Action
            </Label>
            <Select
              value={draft.action || "any"}
              onValueChange={(value) =>
                setDraft({ ...draft, action: value === "any" ? "" : value })
              }
            >
              <SelectTrigger id="audit-action">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any action</SelectItem>
                {ACTIONS.map((action) => (
                  <SelectItem key={action} value={action}>
                    {actionLabel(action)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="audit-outcome" className="text-xs">
              Outcome
            </Label>
            <Select
              value={draft.outcome || "any"}
              onValueChange={(value) =>
                setDraft({
                  ...draft,
                  outcome: value === "any" ? "" : (value as "success" | "failure"),
                })
              }
            >
              <SelectTrigger id="audit-outcome">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any outcome</SelectItem>
                <SelectItem value="success">Succeeded</SelectItem>
                <SelectItem value="failure">Denied or failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="audit-grant" className="text-xs">
              Grant id
            </Label>
            <Input
              id="audit-grant"
              inputMode="numeric"
              value={draft.grantId}
              onChange={(e) => setDraft({ ...draft, grantId: e.target.value })}
            />
          </div>
          <div className="flex items-end gap-2">
            <Button type="submit" size="sm" disabled={audit.refreshing}>
              <Search className="mr-2 h-4 w-4" aria-hidden="true" />
              Apply
            </Button>
            {filtersOn && (
              <Button type="button" variant="outline" size="sm" onClick={clear}>
                <X className="mr-2 h-4 w-4" aria-hidden="true" />
                Clear
              </Button>
            )}
          </div>
        </form>

        <div className="mt-4">
          <LoadState
            loading={audit.loading}
            error={audit.error}
            forbidden={audit.forbidden}
            onRetry={() => void audit.reload()}
            label="the audit log"
          />

          {audit.data && (
            <>
              {!audit.data.data.length ? (
                <p className="text-sm text-muted-foreground">
                  {filtersOn
                    ? "No rows match those filters. That is a filter result, not an empty log."
                    : "Nothing has happened in the data room yet."}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <caption className="sr-only">
                      Audit rows, newest first, with the actor, the action, the target and the
                      originating IP address.
                    </caption>
                    <thead>
                      <tr className="border-b border-border/60 text-left text-muted-foreground">
                        <th scope="col" className="px-2 py-2 font-medium">
                          When
                        </th>
                        <th scope="col" className="px-2 py-2 font-medium">
                          Who
                        </th>
                        <th scope="col" className="px-2 py-2 font-medium">
                          Action
                        </th>
                        <th scope="col" className="px-2 py-2 font-medium">
                          Target
                        </th>
                        <th scope="col" className="px-2 py-2 font-medium">
                          Detail
                        </th>
                        <th scope="col" className="px-2 py-2 font-medium">
                          IP
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {audit.data.data.map((row) => (
                        <tr key={row.id} className="border-b border-border/50">
                          <td className="px-2 py-2 whitespace-nowrap text-muted-foreground">
                            {formatDateTime(row.at)}
                          </td>
                          <td className="max-w-48 px-2 py-2">
                            <div className="truncate">
                              {row.visitorName ?? row.visitorEmail ?? row.adminUser ?? "system"}
                            </div>
                            {row.organization && (
                              <div className="truncate text-[11px] text-muted-foreground">
                                {row.organization}
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-2 font-medium">{actionLabel(row.action)}</td>
                          <td className="max-w-48 truncate px-2 py-2 text-muted-foreground">
                            {row.targetTitle ?? row.targetType ?? "—"}
                          </td>
                          <td className="max-w-56 truncate px-2 py-2 text-muted-foreground">
                            {row.details ?? "—"}
                          </td>
                          <td className="px-2 py-2 font-mono text-[11px] text-muted-foreground">
                            {row.ipAddress ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  Page {audit.data.current_page} of {audit.data.last_page} · {audit.data.total} rows
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={audit.data.current_page <= 1 || audit.refreshing}
                    onClick={() => apply(audit.data!.current_page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={audit.data.current_page >= audit.data.last_page || audit.refreshing}
                    onClick={() => apply(audit.data!.current_page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
