import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { EmptyState, SectionCard, StatCard } from "@/components/admin/ui-bits";
import { Award, TrendingUp, Users, Share2, ArrowRight, Loader2, AlertTriangle } from "lucide-react";
import { referralsApi, settingsApi, ApiError } from "@/lib/api";
import type { ReferralProgram } from "@/lib/api";
import type { ReferralAnalytics, ReferralLeaderboardEntry } from "@/lib/types";
import { PeriodSelect } from "@/components/admin/period-select";
import { periodCaption, periodPhrase } from "@/lib/admin/analytics-period";
import type { AnalyticsPeriod } from "@/lib/api/analytics";
import { formatMoney } from "@/lib/admin/referral-rewards";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Badge } from "@/components/ui/badge";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/admin/referrals/")({
  component: ReferralOverview,
});

type OverviewData = {
  leaderboard: ReferralLeaderboardEntry[];
  analytics: ReferralAnalytics;
};

const numberFormat = new Intl.NumberFormat("en-NG");
const formatNumber = (value: number) => numberFormat.format(value);

function ReferralOverview() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [period, setPeriod] = useState<AnalyticsPeriod>(30);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (selected: AnalyticsPeriod, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [leaderboard, analytics] = await Promise.all([
        referralsApi.leaderboard(),
        referralsApi.analytics(selected),
      ]);
      setData({ leaderboard: leaderboard.data, analytics: analytics.data });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError
          : err instanceof Error
            ? err.message
            : "Could not load the referral overview.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(period, data !== null);
    // `data` is read only to pick spinner vs inline refresh; including it
    // would refetch after every successful load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, load]);

  // A reward run changes pending counts and paid totals.
  useEffect(() => {
    const onChange = () => void load(period, true);
    window.addEventListener("referrals:changed", onChange);
    return () => window.removeEventListener("referrals:changed", onChange);
  }, [load, period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-16 text-center">
        <AlertTriangle className="h-6 w-6 text-destructive" />
        <p className="text-sm font-medium text-destructive">
          {error ?? "Could not load the referral overview."}
        </p>
        <Button variant="outline" size="sm" onClick={() => void load(period)}>
          Retry
        </Button>
      </div>
    );
  }

  const { analytics, leaderboard } = data;
  const signupTrend = analytics.trend;
  const hasTrend = signupTrend.some((point) => point.signups > 0 || point.visits > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Referral activity for {periodPhrase(period)}.
        </p>
        <div className="flex items-center gap-2">
          {refreshing && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <PeriodSelect value={period} onChange={setPeriod} disabled={refreshing} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Referred signups"
          value={formatNumber(analytics.totalReferred)}
          icon={Share2}
          hint={periodPhrase(period)}
        />
        <StatCard
          label="Active referrers"
          value={formatNumber(analytics.activeReferrers)}
          icon={Users}
          hint={
            period === 0
              ? "everyone with a referral"
              : `referred someone in ${periodPhrase(period)}`
          }
        />
        <StatCard
          label="Rewards paid"
          value={analytics.rewards.amountPaidLabel}
          icon={Award}
          hint={
            analytics.rewards.pendingReferrals > 0
              ? `${formatNumber(analytics.rewards.pendingReferrals)} referrals awaiting payout`
              : "nothing pending"
          }
        />
        <StatCard
          label="Signup rate"
          value={`${analytics.conversionRate}%`}
          icon={TrendingUp}
          hint={`of ${formatNumber(analytics.totalVisits)} link visits`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          title="Referral growth"
          description={periodCaption("Signups attributed to a referral link", period)}
          className="lg:col-span-2"
        >
          {hasTrend ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={signupTrend}>
                  <defs>
                    <linearGradient id="refG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--gold)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="signups"
                    stroke="var(--gold)"
                    strokeWidth={2.5}
                    fill="url(#refG)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              illustration="chart"
              title="No referral activity yet"
              description="This chart fills in as referral links get clicked and convert."
            />
          )}
        </SectionCard>

        <ProgramCard program={analytics.program} onSaved={() => void load(period, true)} />
      </div>

      <SectionCard
        title="Top referrers"
        description="Ranked by lifetime referrals"
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin/referrals/leaderboard">
              Full leaderboard <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        }
      >
        {leaderboard.length === 0 ? (
          <EmptyState
            illustration="inbox"
            title="No referrers yet"
            description="This list fills in when waitlist members start sharing their links."
          />
        ) : (
          <div className="space-y-2">
            {leaderboard.slice(0, 5).map((u) => (
              <Link
                key={u.id}
                to="/admin/referrals/$id"
                params={{ id: u.id }}
                className="flex items-center gap-3 rounded-xl border border-border/60 p-3 hover:bg-muted/40"
              >
                <Badge className="bg-gold/20 text-gold-foreground font-bold">#{u.rank}</Badge>
                <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {initials(u.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {u.city} · {u.email}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{u.referrals} refs</div>
                  <div className="text-xs text-gold font-semibold">{u.points} pts</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
}

/**
 * The reward structure card, backed by the `referrals` settings group.
 *
 * This used to be four hardcoded strings ("₦500 credit"…) and an "Edit
 * program" button with no handler. The values shown are the ones
 * `RewardDispatcher` actually pays with, and editing persists via
 * `PATCH /settings/referrals`.
 */
function ProgramCard({ program, onSaved }: { program: ReferralProgram; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ReferralProgram>(program);

  useEffect(() => setForm(program), [program]);

  const money = (amount: number) => formatMoney(amount, program.currency);

  const save = async () => {
    setSaving(true);
    try {
      await settingsApi.update("referrals", {
        rewardsEnabled: form.rewardsEnabled,
        referrerReward: form.referrerReward,
        referredReward: form.referredReward,
        minimumVerifiedForPayout: form.minimumVerifiedForPayout,
        bonusMilestoneRefs: form.bonusMilestoneRefs,
        bonusMilestoneReward: form.bonusMilestoneReward,
      });
      toast.success("Referral program updated", {
        description: "New reward runs use these amounts immediately.",
      });
      setOpen(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.firstError : "Could not save the program.");
    } finally {
      setSaving(false);
    }
  };

  const numberField = (
    label: string,
    key: keyof Pick<
      ReferralProgram,
      | "referrerReward"
      | "referredReward"
      | "minimumVerifiedForPayout"
      | "bonusMilestoneRefs"
      | "bonusMilestoneReward"
    >,
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={`program-${key}`}>{label}</Label>
      <Input
        id={`program-${key}`}
        type="number"
        min={0}
        value={form[key]}
        onChange={(event) =>
          setForm((current) => ({
            ...current,
            [key]: Math.max(0, Number(event.target.value) || 0),
          }))
        }
        disabled={saving}
      />
    </div>
  );

  return (
    <SectionCard title="Program settings" description="Current reward structure">
      <div className="space-y-3 text-sm">
        <SettingRow
          label="Referrer reward"
          value={program.rewardsEnabled ? `${money(program.referrerReward)} credit` : "paused"}
        />
        <SettingRow
          label="Referred user reward"
          value={`${money(program.referredReward)} credit`}
        />
        <SettingRow
          label="Minimum for payout"
          value={`${program.minimumVerifiedForPayout} verified`}
        />
        <SettingRow
          label="Bonus milestone"
          value={
            program.bonusMilestoneRefs > 0
              ? `${program.bonusMilestoneRefs} refs = ${money(program.bonusMilestoneReward)}`
              : "none"
          }
        />
      </div>
      <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => setOpen(true)}>
        Edit program
      </Button>

      <Dialog open={open} onOpenChange={(next) => !saving && setOpen(next)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit referral program</DialogTitle>
            <DialogDescription>
              Amounts are in {program.currency}. Changes apply to future reward runs only; nothing
              already paid is recalculated.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5">
              <div>
                <div className="text-sm font-medium">Rewards enabled</div>
                <div className="text-xs text-muted-foreground">
                  When off, reward runs skip everyone.
                </div>
              </div>
              <Switch
                checked={form.rewardsEnabled}
                onCheckedChange={(checked) =>
                  setForm((current) => ({ ...current, rewardsEnabled: checked }))
                }
                disabled={saving}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {numberField("Referrer reward", "referrerReward")}
              {numberField("Referred reward", "referredReward")}
              {numberField("Minimum verified", "minimumVerifiedForPayout")}
              {numberField("Milestone refs", "bonusMilestoneRefs")}
            </div>
            {numberField("Milestone bonus", "bonusMilestoneReward")}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={() => void save()}
              disabled={saving}
              className="bg-primary hover:bg-primary/90"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save program
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
