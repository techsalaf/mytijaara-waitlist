import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Download, Award, Loader2, AlertTriangle } from "lucide-react";
import { referralsApi, downloadEndpoint, ApiError } from "@/lib/api";
import type { PendingReward, ReferralProgram } from "@/lib/api";
import {
  eligibleRewards,
  formatMoney,
  referralExportFilename,
  rewardOutcome,
  rewardPlan,
  rewardSummary,
} from "@/lib/admin/referral-rewards";

export const Route = createFileRoute("/admin/referrals")({
  head: () => ({
    meta: [{ title: "Referrals — MyTijaara Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: ReferralsLayout,
});

const tabs = [
  { to: "/admin/referrals", label: "Overview", exact: true },
  { to: "/admin/referrals/leaderboard", label: "Leaderboard" },
  { to: "/admin/referrals/analytics", label: "Analytics" },
];

function ReferralsLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [exporting, setExporting] = useState(false);

  const exportCsv = async () => {
    setExporting(true);
    try {
      // Streamed server-side (`ReferralController::export`) so the file covers
      // every referrer, not just whichever page happens to be loaded.
      await downloadEndpoint("/referrals/export", referralExportFilename());
      toast.success("Referral export downloaded");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.firstError : "The export failed.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Referral Program"
        description="Track referrals, reward top performers, and measure viral growth."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={exporting}>
              {exporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Export
            </Button>
            <SendRewardsButton />
          </>
        }
      />
      <div className="flex gap-1 border-b border-border/60">
        {tabs.map((t) => {
          const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
      <Outlet />
    </div>
  );
}

/**
 * "Send rewards" flow. The old button had no handler at all.
 *
 * Opening the dialog loads the real pending list from
 * `GET /referrals/rewards/pending`, shows exactly who will be paid what, and
 * only then posts. The backend is idempotent (`referrals.rewarded_at`), so a
 * double-click or a retry after a partial failure cannot pay anyone twice.
 */
function SendRewardsButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingReward[]>([]);
  const [program, setProgram] = useState<ReferralProgram | null>(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await referralsApi.pendingRewards();
      setPending(response.data);
      setProgram((response.meta?.program as ReferralProgram) ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.firstError : "Could not load pending rewards.");
    } finally {
      setLoading(false);
    }
  };

  const openDialog = () => {
    setOpen(true);
    setNote("");
    void load();
  };

  const eligible = eligibleRewards(pending);

  const send = async () => {
    if (eligible.length === 0) return;
    setSending(true);
    try {
      const response = await referralsApi.sendRewards(
        eligible.map((row) => row.id),
        note.trim() || undefined,
      );
      const result = response.data;
      const outcome = rewardOutcome(result);
      const summary = rewardSummary(result);
      const description = result.messages.slice(0, 4).join(" ");

      if (outcome === "success") toast.success(summary, { description });
      else if (outcome === "partial") toast.warning(summary, { description });
      else toast.error(summary, { description });

      // Charts and the pending badge on the overview read this.
      window.dispatchEvent(new CustomEvent("referrals:changed"));
      setOpen(false);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.firstError : "The reward run failed. Nothing was recorded.",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={openDialog}>
        <Award className="mr-2 h-4 w-4" /> Send rewards
      </Button>
      <Dialog open={open} onOpenChange={(next) => !sending && setOpen(next)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Send referral rewards</DialogTitle>
            <DialogDescription>
              {program
                ? rewardPlan(pending, program)
                : "Confirmed, unpaid referrals are settled at the current program rate."}
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div>
                <p className="font-medium text-destructive">{error}</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => void load()}>
                  Retry
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="max-h-64 space-y-1 overflow-y-auto">
                {pending.length === 0 && (
                  <p className="rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">
                    Every confirmed referral has already been rewarded.
                  </p>
                )}
                {pending.map((row) => (
                  <div
                    key={row.id}
                    className={cn(
                      "flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm",
                      !row.eligible && "opacity-60",
                    )}
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{row.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.pending} unpaid · {row.lifetimeConverted} confirmed lifetime
                        {!row.eligible && program
                          ? ` · needs ${program.minimumVerifiedForPayout}`
                          : ""}
                      </div>
                    </div>
                    <div className="ml-3 shrink-0 font-semibold">
                      {row.eligible && program ? formatMoney(row.payout, program.currency) : "held"}
                    </div>
                  </div>
                ))}
              </div>
              {pending.length > 0 && (
                <Input
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Note to include in the reward email (optional)"
                  maxLength={255}
                  disabled={sending}
                />
              )}
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>
              Cancel
            </Button>
            <Button
              onClick={() => void send()}
              disabled={loading || sending || !!error || eligible.length === 0}
              className="bg-primary hover:bg-primary/90"
            >
              {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {eligible.length > 0 && program
                ? `Pay ${formatMoney(
                    eligible.reduce((sum, row) => sum + row.payout, 0),
                    program.currency,
                  )}`
                : "Send rewards"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
