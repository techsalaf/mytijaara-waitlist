import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { StatCard, SectionCard } from "@/components/admin/ui-bits";
import { Award, TrendingUp, Users, Share2, ArrowRight } from "lucide-react";
import { referralsApi } from "@/lib/api";
import type { ReferralAnalytics, ReferralLeaderboardEntry } from "@/lib/types";
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

export const Route = createFileRoute("/admin/referrals/")({
  component: ReferralOverview,
});

function ReferralOverview() {
  const [referralLeaderboard, setReferralLeaderboard] = useState<ReferralLeaderboardEntry[]>([]);
  const [analytics, setAnalytics] = useState<ReferralAnalytics | null>(null);
  useEffect(() => {
    void Promise.all([referralsApi.leaderboard(), referralsApi.analytics()]).then(
      ([leaderboard, analyticsResponse]) => {
        setReferralLeaderboard(leaderboard.data);
        setAnalytics(analyticsResponse.data);
      },
    );
  }, []);
  const formatNumber = (value: number) => new Intl.NumberFormat("en-NG").format(value);
  const totalRefs = referralLeaderboard.reduce((s, u) => s + u.referrals, 0);
  const signupTrend = analytics?.trend ?? [];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total referrals"
          value={formatNumber(analytics?.totalReferred ?? totalRefs)}
          delta={0}
          icon={Share2}
        />
        <StatCard
          label="Active referrers"
          value={analytics?.activeReferrers ?? referralLeaderboard.length}
          delta={0}
          icon={Users}
        />
        <StatCard
          label="Avg per referrer"
          value={
            analytics?.activeReferrers
              ? ((analytics.totalReferred || 0) / analytics.activeReferrers).toFixed(1)
              : "0"
          }
          icon={Award}
        />
        <StatCard
          label="Signup rate"
          value={`${analytics?.conversionRate ?? 0}%`}
          delta={0}
          icon={TrendingUp}
          hint="Referral visit conversion"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          title="Referral growth"
          description="Signups attributed to referral link"
          className="lg:col-span-2"
        >
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
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
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
        </SectionCard>

        <SectionCard title="Program settings" description="Current reward structure">
          <div className="space-y-3 text-sm">
            <SettingRow label="Referrer reward" value="₦500 credit" />
            <SettingRow label="Referred user reward" value="₦250 credit" />
            <SettingRow label="Minimum for payout" value="3 verified" />
            <SettingRow label="Bonus milestone" value="10 refs = ₦5,000" />
          </div>
          <Button variant="outline" size="sm" className="mt-4 w-full">
            Edit program
          </Button>
        </SectionCard>
      </div>

      <SectionCard
        title="Top referrers"
        description="This month's leaders"
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin/referrals/leaderboard">
              Full leaderboard <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        }
      >
        <div className="space-y-2">
          {referralLeaderboard.slice(0, 5).map((u) => (
            <Link
              key={u.id}
              to="/admin/referrals/$id"
              params={{ id: u.id }}
              className="flex items-center gap-3 rounded-xl border border-border/60 p-3 hover:bg-muted/40"
            >
              <Badge className="bg-gold/20 text-gold-foreground font-bold">#{u.rank}</Badge>
              <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {u.name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")}
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
      </SectionCard>
    </div>
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
