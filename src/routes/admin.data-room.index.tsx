/**
 * `/admin/data-room` overview.
 *
 * Counts plus the effective policy. The policy block is the part worth having:
 * settings in the database are ANDed with the ceilings in `config/dataroom.php`, so
 * a room can read "watermark enabled" in settings while the environment has it off.
 * Both values are shown rather than the stored one alone.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback } from "react";
import {
  Activity,
  Download,
  Eye,
  FileText,
  FolderTree,
  HardDrive,
  KeyRound,
  ShieldAlert,
  Users,
} from "lucide-react";
import { SectionCard, StatCard } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import { DetailRow, loadState } from "@/components/admin/dataroom/bits";
import { useResource } from "@/components/admin/dataroom/use-resource";
import { dataRoomAdminApi } from "@/lib/api/dataroom-admin";
import { formatBytes } from "@/lib/dataroom/format";

export const Route = createFileRoute("/admin/data-room/")({
  component: DataRoomOverview,
});

const numberFormat = new Intl.NumberFormat("en-NG");

function DataRoomOverview() {
  const load = useCallback(async () => (await dataRoomAdminApi.overview()).data, []);
  const overview = useResource(load, "Could not load the data room overview.");

  const state = loadState({
    loading: overview.loading,
    error: overview.error,
    forbidden: overview.forbidden,
    onRetry: () => void overview.reload(),
    label: "the data room overview",
  });
  if (state || !overview.data) return state;

  const data = overview.data;
  const policy = data.policy;
  const env = policy.environment;

  return (
    <div className="space-y-6">
      {policy.emergencyLockdown && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-5 py-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 text-destructive" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-destructive">The room is locked</p>
              <p className="text-xs text-muted-foreground">
                No visitor can sign in, whatever their grant says. Unlock it from Settings.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/data-room/settings">Open settings</Link>
          </Button>
        </div>
      )}

      {!policy.enabled && !policy.emergencyLockdown && (
        <div className="rounded-2xl border border-[var(--gold)]/45 bg-[var(--gold)]/10 px-5 py-4">
          <p className="text-sm font-semibold">The data room is switched off</p>
          <p className="text-xs text-muted-foreground">
            `/dataroom` answers, and refuses everyone. Turn it on in Settings when you are ready to
            issue access.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Published documents"
          value={numberFormat.format(data.documents.published)}
          icon={FileText}
          hint={`${data.documents.total} total, ${data.documents.draft} draft, ${data.documents.archived} archived`}
        />
        <StatCard
          label="Active grants"
          value={numberFormat.format(data.grants.active)}
          icon={KeyRound}
          hint={`${data.grants.pending} pending, ${data.grants.expired} expired, ${data.grants.revoked} revoked`}
        />
        <StatCard
          label="Document views"
          value={numberFormat.format(data.engagement.totalViews)}
          icon={Eye}
          hint={`${data.engagement.last7Days} interactions in the last 7 days`}
        />
        <StatCard
          label="Downloads"
          value={numberFormat.format(data.engagement.totalDownloads)}
          icon={Download}
          hint={`${data.engagement.activeSessions} sessions open now`}
        />
        <StatCard
          label="Categories"
          value={numberFormat.format(data.foldersCount)}
          icon={FolderTree}
        />
        <StatCard label="Storage used" value={formatBytes(data.storage.bytes)} icon={HardDrive} />
        <StatCard
          label="Suspended or exhausted"
          value={numberFormat.format(data.grants.suspended + data.grants.exhausted)}
          icon={Users}
          hint="Grants that will refuse a sign-in until you act"
        />
        <StatCard
          label="Grants issued"
          value={numberFormat.format(data.grants.total)}
          icon={Activity}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Effective policy"
          description="What the room does right now, after the environment ceilings are applied."
        >
          <dl className="grid gap-x-6 sm:grid-cols-2">
            <DetailRow label="Open to visitors">{policy.openToVisitors ? "Yes" : "No"}</DetailRow>
            <DetailRow label="Global PIN">
              {policy.globalPinEnabled
                ? policy.globalPinConfigured
                  ? env.pinPinnedByEnvironment
                    ? "On, set in the environment"
                    : "On"
                  : "On, but no PIN is set"
                : "Off"}
            </DetailRow>
            <DetailRow label="Idle timeout">
              {policy.effectiveIdleTimeoutMinutes} minutes
              {policy.sessionTimeoutMinutes !== policy.effectiveIdleTimeoutMinutes && (
                <span className="text-xs text-muted-foreground">
                  {" "}
                  (setting asks {policy.sessionTimeoutMinutes}, ceiling is{" "}
                  {env.idleTimeoutCeilingMinutes})
                </span>
              )}
            </DetailRow>
            <DetailRow label="Absolute session ceiling">
              {policy.effectiveAbsoluteTtlMinutes} minutes
            </DetailRow>
            <DetailRow label="Failed attempts before lockout">
              {policy.effectiveMaxFailedAttempts}
            </DetailRow>
            <DetailRow label="Downloads">
              {policy.downloadsEnabled ? "Allowed" : "Blocked room-wide"}
            </DetailRow>
            <DetailRow label="Watermarking">
              {policy.effectiveWatermarkEnabled ? "On, PDFs only" : "Off"}
              {policy.watermarkEnabled && !env.watermarkEnabled && (
                <span className="text-xs text-muted-foreground">
                  {" "}
                  (on in settings, off in the environment)
                </span>
              )}
            </DetailRow>
            <DetailRow label="Audit logging">{policy.auditLoggingEnabled ? "On" : "Off"}</DetailRow>
            <DetailRow label="Malware scanning">
              {env.malwareScanning ? "Provisioned" : "Not provisioned"}
            </DetailRow>
            <DetailRow label="Storage disk">{env.storageDisk}</DetailRow>
          </dl>
          {!env.malwareScanning && (
            <p className="mt-3 rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              No scanner is installed, so uploads are validated and stored without being scanned.
              Uploads report <code>malwareScanned: false</code> and the audit row says "not
              configured" rather than "clean". Install ClamAV and set{" "}
              <code>DATA_ROOM_AV_ENABLED=true</code> to close it.
            </p>
          )}
        </SectionCard>

        <SectionCard
          title="Next steps"
          description="The shortest path from empty room to first investor."
        >
          <ol className="space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                1
              </span>
              <span>
                Upload the documents and publish the ones an investor should see.{" "}
                <Link to="/admin/data-room/documents" className="text-primary hover:underline">
                  Documents
                </Link>
              </span>
            </li>
            <li className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                2
              </span>
              <span>
                Create an access grant for one named person and copy the code once.{" "}
                <Link to="/admin/data-room/grants" className="text-primary hover:underline">
                  Access grants
                </Link>
              </span>
            </li>
            <li className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                3
              </span>
              <span>
                Check the matrix reads the way you intended before you send anything.{" "}
                <Link to="/admin/data-room/matrix" className="text-primary hover:underline">
                  Permission matrix
                </Link>
              </span>
            </li>
            <li className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                4
              </span>
              <span>
                Send the visitor the link, their email address and the code, over a channel you
                trust. Nothing is emailed automatically.
              </span>
            </li>
          </ol>
        </SectionCard>
      </div>
    </div>
  );
}
