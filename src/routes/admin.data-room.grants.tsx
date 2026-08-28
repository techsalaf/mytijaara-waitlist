/**
 * `/admin/data-room/grants` — who may open the room, and what they see.
 *
 * The plaintext access code exists exactly once, in the response to
 * `createGrant` / `regenerateGrant`, and is handed straight to
 * `GrantShareDialog`. It is never stored in this component's state beyond that
 * dialog, never logged, and never refetched: the backend keeps a hash.
 *
 * Suspend, revoke and regenerate destroy live sessions server-side. The returned
 * count is surfaced so the operator knows whether they just signed somebody out
 * mid-read.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { KeyRound, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { SectionCard } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ConfirmationModal,
  DetailRow,
  loadState,
  StatusPill,
} from "@/components/admin/dataroom/bits";
import { errorMessage, useResource } from "@/components/admin/dataroom/use-resource";
import { GrantTable, type GrantTableAction } from "@/components/admin/dataroom/grant-table";
import { GrantWizard } from "@/components/admin/dataroom/grant-wizard";
import { GrantShareDialog } from "@/components/admin/dataroom/grant-share";
import { dataRoomAdminApi } from "@/lib/api/dataroom-admin";
import type {
  DataRoomAccessTemplate,
  DataRoomAdminDocument,
  DataRoomAdminFolder,
  DataRoomAdminGrant,
  DataRoomGrantDetail,
  DataRoomGrantDuration,
} from "@/lib/api/dataroom-admin";
import { actionLabel, formatDateTime, formatRelative } from "@/lib/dataroom/format";
import { grantStatusView } from "@/lib/dataroom/admin-format";

export const Route = createFileRoute("/admin/data-room/grants")({
  component: DataRoomGrantsRoute,
});

type Loaded = {
  grants: DataRoomAdminGrant[];
  folders: DataRoomAdminFolder[];
  documents: DataRoomAdminDocument[];
  templates: DataRoomAccessTemplate[];
  defaultDuration: DataRoomGrantDuration;
};

/** What a confirmation is about. Kept as data so the copy lives in one place. */
type Pending =
  | { kind: "status"; grant: DataRoomAdminGrant; status: "active" | "suspended" | "revoked" }
  | { kind: "regenerate"; grant: DataRoomAdminGrant }
  | { kind: "delete"; grant: DataRoomAdminGrant };

const PENDING_COPY: Record<
  "active" | "suspended" | "revoked",
  { title: string; effect: string; reversal: string; destructive: boolean; phrase?: string }
> = {
  active: {
    title: "Reactivate this grant",
    effect: "The visitor can sign in again with the code they already have.",
    reversal: "Suspend it again at any time.",
    destructive: false,
  },
  suspended: {
    title: "Suspend this grant",
    effect: "Every live session for this visitor ends now and the code stops working.",
    reversal: "Reversible: reactivate the grant and the same code works again.",
    destructive: true,
  },
  revoked: {
    title: "Revoke this grant",
    effect: "Sessions end now, the code dies, and the grant cannot be reactivated.",
    reversal: "Not reversible. Issue a new grant to restore access.",
    destructive: true,
    phrase: "REVOKE",
  },
};

function DataRoomGrantsRoute() {
  const load = useCallback(async (): Promise<Loaded> => {
    const [grants, folders, documents, templates, durations] = await Promise.all([
      dataRoomAdminApi.grants(),
      dataRoomAdminApi.folders(),
      dataRoomAdminApi.documents(),
      dataRoomAdminApi.templates(),
      dataRoomAdminApi.durations(),
    ]);
    return {
      grants: grants.data,
      folders: folders.data,
      documents: documents.data,
      templates: templates.data,
      defaultDuration: (durations.data.default as DataRoomGrantDuration) ?? "7d",
    };
  }, []);
  const res = useResource(load, "Could not load the access grants.");

  const [wizardOpen, setWizardOpen] = useState(false);
  const [share, setShare] = useState<{
    grant: DataRoomAdminGrant;
    accessCode: string;
    sessionsDestroyed?: number;
  } | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);

  const state = loadState({
    loading: res.loading,
    error: res.error,
    forbidden: res.forbidden,
    onRetry: () => void res.reload(),
    label: "the access grants",
  });
  if (state || !res.data) return state;

  const data = res.data;

  function handleAction(grant: DataRoomAdminGrant, action: GrantTableAction) {
    if (action.kind === "open") {
      setDetailId(grant.id);
      return;
    }
    if (action.kind === "status") {
      setPending({ kind: "status", grant, status: action.status });
      return;
    }
    if (action.kind === "regenerate") {
      setPending({ kind: "regenerate", grant });
      return;
    }
    setPending({ kind: "delete", grant });
  }

  async function confirmPending() {
    if (!pending) return;
    setBusy(true);
    try {
      if (pending.kind === "status") {
        const result = await dataRoomAdminApi.setGrantStatus(pending.grant.id, pending.status);
        toast.success(
          result.data.sessionsDestroyed > 0
            ? `Grant ${pending.status}. ${result.data.sessionsDestroyed} live session(s) ended.`
            : `Grant ${pending.status}.`,
        );
      } else if (pending.kind === "regenerate") {
        const result = await dataRoomAdminApi.regenerateGrant(pending.grant.id);
        setShare({
          grant: result.data.grant,
          accessCode: result.data.accessCode,
          sessionsDestroyed: result.data.sessionsDestroyed,
        });
      } else {
        await dataRoomAdminApi.deleteGrant(pending.grant.id);
        toast.success("Grant deleted. The audit trail keeps the history.");
      }
      setPending(null);
      await res.reload();
    } catch (error) {
      toast.error(errorMessage(error, "The change was refused."));
    } finally {
      setBusy(false);
    }
  }

  const copy =
    pending?.kind === "status"
      ? PENDING_COPY[pending.status]
      : pending?.kind === "regenerate"
        ? {
            title: "Issue a new access code",
            effect:
              "A new code is generated and shown once. The old code stops working immediately and every session opened with it ends.",
            reversal: "The old code cannot be brought back. Deliver the new one yourself.",
            destructive: true,
            phrase: undefined as string | undefined,
          }
        : pending
          ? {
              title: "Delete this grant",
              effect: "The grant row is removed and the visitor can no longer sign in.",
              reversal:
                "Not reversible. The audit log keeps what this visitor did; the grant itself is gone.",
              destructive: true,
              phrase: "DELETE" as string | undefined,
            }
          : null;

  return (
    <div className="space-y-6">
      <SectionCard
        title="Access grants"
        description="Each grant is one named person, one email address and one code. Nothing is emailed automatically."
        actions={
          <Button size="sm" onClick={() => setWizardOpen(true)}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            New grant
          </Button>
        }
      >
        <GrantTable
          grants={data.grants}
          onAction={handleAction}
          emptyAction={
            <Button size="sm" onClick={() => setWizardOpen(true)}>
              <KeyRound className="mr-2 h-4 w-4" aria-hidden="true" />
              Create the first grant
            </Button>
          }
        />
      </SectionCard>

      <GrantWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        folders={data.folders}
        documents={data.documents}
        templates={data.templates}
        defaultDuration={data.defaultDuration}
        onCreate={async (body) => {
          const result = await dataRoomAdminApi.createGrant(body);
          setWizardOpen(false);
          setShare({ grant: result.data.grant, accessCode: result.data.accessCode });
          await res.reload();
        }}
      />

      {share && (
        <GrantShareDialog
          open
          onOpenChange={(open) => {
            if (!open) setShare(null);
          }}
          grant={share.grant}
          accessCode={share.accessCode}
          sessionsDestroyed={share.sessionsDestroyed}
        />
      )}

      {pending && copy && (
        <ConfirmationModal
          open
          onOpenChange={(open) => {
            if (!open) setPending(null);
          }}
          title={copy.title}
          effect={`${pending.grant.visitorEmail}: ${copy.effect}`}
          reversal={copy.reversal}
          phrase={copy.phrase}
          destructive={copy.destructive}
          busy={busy}
          confirmLabel={copy.title}
          onConfirm={() => void confirmPending()}
        />
      )}

      {detailId !== null && <GrantDetailDialog id={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}

/**
 * One grant, its scope, its live sessions and its last 200 audit rows.
 *
 * Nothing here can reveal the code: the detail payload carries `codeHint` only.
 */
function GrantDetailDialog({ id, onClose }: { id: number; onClose: () => void }) {
  const [detail, setDetail] = useState<DataRoomGrantDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    dataRoomAdminApi
      .grant(id)
      .then((response) => {
        if (live) setDetail(response.data);
      })
      .catch((err: unknown) => {
        if (live) setError(errorMessage(err, "Could not load this grant."));
      });
    return () => {
      live = false;
    };
  }, [id]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{detail?.visitorName ?? detail?.visitorEmail ?? "Access grant"}</DialogTitle>
          <DialogDescription>
            {detail
              ? `${detail.visitorEmail}${detail.organization ? ` · ${detail.organization}` : ""}`
              : "Loading the grant…"}
          </DialogDescription>
        </DialogHeader>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {!detail && !error && (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span role="status">Loading…</span>
          </div>
        )}

        {detail && (
          <div className="space-y-5">
            <dl className="grid gap-x-6 sm:grid-cols-2">
              <DetailRow label="Status">
                <StatusPill view={grantStatusView(detail.status)} />
                {detail.storedStatus !== detail.status && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    stored as {detail.storedStatus}
                  </span>
                )}
              </DetailRow>
              <DetailRow label="Code">
                {detail.codeHint ? `ends ${detail.codeHint}` : "not recoverable"}
              </DetailRow>
              <DetailRow label="Starts">{formatDateTime(detail.startsAt)}</DetailRow>
              <DetailRow label="Expires">
                {detail.neverExpires ? "Never" : formatDateTime(detail.expiresAt)}
              </DetailRow>
              <DetailRow label="Uses">
                {detail.currentUses}
                {detail.maxUses === null ? " of unlimited" : ` of ${detail.maxUses}`}
              </DetailRow>
              <DetailRow label="Downloads">
                {detail.downloadsPermitted ? "Permitted" : "View only"}
              </DetailRow>
              <DetailRow label="Scope">
                {detail.allDocumentsAccess
                  ? "Every published document"
                  : `${detail.folders?.length ?? 0} categories, ${detail.documents?.length ?? 0} documents`}
              </DetailRow>
              <DetailRow label="Acknowledged confidentiality">
                {formatDateTime(detail.acknowledgedAt)}
              </DetailRow>
              <DetailRow label="Created by">{detail.createdBy ?? "—"}</DetailRow>
              <DetailRow label="Last seen">{formatRelative(detail.lastAccessedAt)}</DetailRow>
            </dl>

            {detail.notes && (
              <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-xs">
                {detail.notes}
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold">Live sessions</h3>
              {!detail.activeSessions.length ? (
                <p className="mt-1 text-xs text-muted-foreground">Nobody is signed in right now.</p>
              ) : (
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {detail.activeSessions.map((session, index) => (
                    <li key={index} className="rounded-lg border border-border/60 px-2 py-1.5">
                      {session.ip_address ?? "unknown IP"} · last active{" "}
                      {formatRelative(session.last_active_at)} · idles out{" "}
                      {formatDateTime(session.expires_at)}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold">History</h3>
              {!detail.history.length ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Nothing yet. The grant has not been used.
                </p>
              ) : (
                <ol className="mt-2 space-y-1.5">
                  {detail.history.map((row, index) => (
                    <li key={index} className="flex gap-3 text-xs">
                      <span className="w-36 shrink-0 text-muted-foreground">
                        {formatDateTime(row.at)}
                      </span>
                      <span className="font-medium">{actionLabel(row.action)}</span>
                      <span className="min-w-0 flex-1 truncate text-muted-foreground">
                        {row.targetTitle ?? row.details ?? ""}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
