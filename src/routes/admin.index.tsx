import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  Users,
  TrendingUp,
  Award,
  MousePointerClick,
  Mail,
  Percent,
  MapPin,
  Smartphone,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  Loader2,
  RefreshCw,
  BadgeCheck,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { toast } from "sonner";

import { PageHeader, StatCard, SectionCard, EmptyState } from "@/components/admin/ui-bits";
import { PeriodSelect } from "@/components/admin/period-select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { analyticsApi, campaignsApi, dashboardApi, referralsApi, ApiError } from "@/lib/api";
import type { AnalyticsPeriod, DashboardStats } from "@/lib/api/analytics";
import { periodCaption, periodGrowth, periodPhrase, trendDays } from "@/lib/admin/analytics-period";
import { firstName, greeting } from "@/lib/admin/greeting";
import { getSession } from "@/lib/auth";
import type {
  Campaign,
  CityBreakdown,
  DeviceBreakdown,
  ReferralLeaderboardEntry,
  SignupTrendPoint,
  TrafficSource,
} from "@/lib/types";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [{ title: "Dashboard — MyTijaara Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: DashboardPage,
});

/** Everything the page renders, refetched as one unit when the period changes. */
type DashboardData = {
  stats: DashboardStats;
  trend: SignupTrendPoint[];
  sources: TrafficSource[];
  cities: CityBreakdown[];
  devices: DeviceBreakdown[];
  leaderboard: ReferralLeaderboardEntry[];
  campaigns: Campaign[];
};

const numberFormat = new Intl.NumberFormat("en-NG");
const formatNumber = (value: number) => numberFormat.format(value);

function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [period, setPeriod] = useState<AnalyticsPeriod>(30);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [digesting, setDigesting] = useState(false);
  const [adminName, setAdminName] = useState<string | null>(null);

  // localStorage, so it cannot run during render.
  useEffect(() => {
    setAdminName(firstName(getSession()?.name));
  }, []);

  const load = useCallback(async (selected: AnalyticsPeriod, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      // Every call takes the selected window. Leaving the argument off is what
      // pinned the whole page to 30 days no matter what the control said.
      const [stats, trend, sources, cities, devices, leaderboard, campaigns] = await Promise.all([
        dashboardApi.stats(selected),
        dashboardApi.trend(trendDays(selected)),
        dashboardApi.sources(selected),
        analyticsApi.cities(selected),
        analyticsApi.devices(selected),
        referralsApi.leaderboard(),
        campaignsApi.list(),
      ]);
      setData({
        stats: stats.data,
        trend: trend.data,
        sources: sources.data,
        cities: cities.data,
        devices: devices.data,
        leaderboard: leaderboard.data,
        campaigns: campaigns.data,
      });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError
          : err instanceof Error
            ? err.message
            : "Could not load the dashboard.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(period, data !== null);
    // `data` is read only to decide spinner vs inline refresh, and including it
    // would refetch on every successful load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, load]);

  const buildDigest = async () => {
    setDigesting(true);
    try {
      const response = await analyticsApi.createDigest(7);
      const { campaignId, metrics } = response.data;
      toast.success(`Weekly digest drafted: ${formatNumber(metrics.signups)} signups`, {
        description: `Saved as ${campaignId}. Review the audience, then send it.`,
        action: {
          label: "Open draft",
          onClick: () => {
            window.location.href = `/admin/email/${campaignId}`;
          },
        },
      });
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.firstError : "Could not build the digest. Nothing was saved.",
      );
    } finally {
      setDigesting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Loading live waitlist numbers…" />
        <div className="grid min-h-[40vh] place-items-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="The dashboard could not be loaded." />
        <SectionCard>
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-sm font-semibold">Could not load the dashboard</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {error ?? "The analytics endpoints returned nothing."}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void load(period)}>
              <RefreshCw className="mr-2 h-4 w-4" /> Retry
            </Button>
          </div>
        </SectionCard>
      </div>
    );
  }

  const { stats, trend, sources, cities, devices, leaderboard, campaigns } = data;
  const maxCityUsers = Math.max(...cities.map((city) => city.users), 1);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting()}${adminName ? `, ${adminName}` : ""} 👋`}
        description={`Live waitlist numbers for ${periodPhrase(period)}.`}
        actions={
          <>
            {refreshing && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <PeriodSelect value={period} onChange={setPeriod} disabled={refreshing} />
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90"
              onClick={() => void buildDigest()}
              disabled={digesting}
            >
              {digesting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              {digesting ? "Building…" : "Weekly digest"}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Signups"
          value={formatNumber(stats.periodSignups ?? 0)}
          delta={
            period === 0
              ? undefined
              : periodGrowth(stats.periodSignups ?? 0, stats.previousPeriodSignups ?? 0)
          }
          icon={Users}
          hint={
            period === 0
              ? "all time"
              : `vs ${formatNumber(stats.previousPeriodSignups ?? 0)} in the previous ${period} days`
          }
        />
        <StatCard
          label="Today's Signups"
          value={formatNumber(stats.todaySignups ?? 0)}
          delta={stats.weeklyGrowth ?? 0}
          icon={TrendingUp}
          hint="week on week"
        />
        <StatCard
          label="Verified"
          value={`${stats.verifiedRate ?? 0}%`}
          icon={BadgeCheck}
          hint={`of signups in ${periodPhrase(period)}`}
        />
        <StatCard
          label="CTA Clicks"
          value={formatNumber(stats.ctaClicks)}
          icon={MousePointerClick}
          hint={
            stats.visitors > 0
              ? `${stats.conversionRate}% of ${formatNumber(stats.visitors)} visitors signed up`
              : "no pageview events recorded yet"
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard
          title="Signup Growth"
          description={periodCaption("Daily signups vs verified users", period === 0 ? 90 : period)}
          className="lg:col-span-2"
        >
          {trend.every((point) => point.signups === 0 && point.verified === 0) ? (
            <EmptyState
              illustration="chart"
              title="No signups in this window"
              description="Pick a longer period, or share the waitlist link to start the series."
            />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="signupG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="verifG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.3} />
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
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    fill="url(#signupG)"
                    name="Signups"
                  />
                  <Area
                    type="monotone"
                    dataKey="verified"
                    stroke="var(--gold)"
                    strokeWidth={2.5}
                    fill="url(#verifG)"
                    name="Verified"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Traffic Sources"
          description={periodCaption("Where signups come from", period)}
        >
          {sources.length === 0 ? (
            <EmptyState
              illustration="chart"
              title="No sources yet"
              description="Source is recorded on signup, so this fills in with the first entry."
            />
          ) : (
            <>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sources}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {sources.map((s) => (
                        <Cell key={s.name} fill={s.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 space-y-1.5">
                {sources.map((s) => (
                  <div key={s.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                      <span>{s.name}</span>
                    </div>
                    <span className="font-semibold">{s.value}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard
          title="Popular Cities"
          description={periodCaption("Top waitlist cities", period)}
          actions={<MapPin className="h-4 w-4 text-muted-foreground" />}
        >
          {cities.length === 0 ? (
            <EmptyState
              illustration="search"
              title="No cities recorded"
              description="City is captured on the waitlist form."
            />
          ) : (
            <div className="space-y-3">
              {cities.slice(0, 6).map((c) => (
                <div key={c.city}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium">{c.city}</span>
                    <span className="text-muted-foreground">
                      {formatNumber(c.users)} users ·{" "}
                      <span className={c.growth >= 0 ? "text-emerald-600" : "text-red-600"}>
                        {c.growth >= 0 ? "+" : ""}
                        {c.growth}%
                      </span>
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(c.users / maxCityUsers) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Devices"
          description={periodCaption("Signup device breakdown", period)}
          actions={<Smartphone className="h-4 w-4 text-muted-foreground" />}
        >
          {devices.length === 0 ? (
            <EmptyState
              illustration="chart"
              title="No device data"
              description="Device is detected from the signup request."
            />
          ) : (
            <>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={devices} layout="vertical" margin={{ left: 10 }}>
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
                    />
                    <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                      {devices.map((d) => (
                        <Cell key={d.name} fill={d.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                {devices.map((d) => (
                  <div key={d.name} className="rounded-lg bg-muted/50 py-2">
                    <div className="font-bold">{d.value}%</div>
                    <div className="text-muted-foreground">{d.name}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </SectionCard>

        <SectionCard
          title="Email Campaigns"
          description="Latest send performance"
          actions={<Mail className="h-4 w-4 text-muted-foreground" />}
        >
          <div className="space-y-3">
            {campaigns.length === 0 ? (
              <EmptyState
                illustration="inbox"
                title="No campaigns yet"
                description="Build the weekly digest to create your first draft."
              />
            ) : (
              campaigns.slice(0, 2).map((campaign) => (
                <div key={campaign.id} className="rounded-xl border border-border/60 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate text-xs font-medium">{campaign.name}</div>
                    <Badge variant="secondary" className="shrink-0 text-[10px] capitalize">
                      {campaign.status}
                    </Badge>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <div className="font-bold">{formatNumber(campaign.sent)}</div>
                      <div className="text-muted-foreground">Sent</div>
                    </div>
                    <div>
                      <div className="font-bold text-primary">
                        {rate(campaign.opens, campaign.sent)}
                      </div>
                      <div className="text-muted-foreground">Opens</div>
                    </div>
                    <div>
                      <div className="font-bold text-gold">
                        {rate(campaign.clicks, campaign.sent)}
                      </div>
                      <div className="text-muted-foreground">Clicks</div>
                    </div>
                  </div>
                </div>
              ))
            )}
            <Button asChild variant="ghost" size="sm" className="w-full">
              <Link to="/admin/email">
                View all campaigns <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Top Referrers"
        description="Users driving the most signups"
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin/referrals">
              See leaderboard <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        }
      >
        {leaderboard.length === 0 ? (
          <EmptyState
            illustration="default"
            title="No referrals yet"
            description="Referrals appear here as soon as a waitlist member's link converts."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="pb-2 font-medium">#</th>
                  <th className="pb-2 font-medium">User</th>
                  <th className="pb-2 font-medium">City</th>
                  <th className="pb-2 font-medium text-right">Referrals</th>
                  <th className="pb-2 font-medium text-right">Points</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.slice(0, 6).map((u) => (
                  <tr key={u.id} className="border-b border-border/40 last:border-0">
                    <td className="py-2.5">
                      <Badge
                        variant="secondary"
                        className="bg-gold/15 font-bold text-gold-foreground"
                      >
                        #{u.rank}
                      </Badge>
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                          {initials(u.name)}
                        </div>
                        <div>
                          <div className="font-medium">{u.name}</div>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 text-muted-foreground">{u.city}</td>
                    <td className="py-2.5 text-right font-semibold">{u.referrals}</td>
                    <td className="py-2.5 text-right">
                      <span className="inline-flex items-center gap-1 rounded-full bg-gold/10 px-2 py-0.5 text-xs font-semibold text-gold-foreground">
                        <Award className="h-3 w-3" /> {u.points}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

/** `opens`/`clicks` as a percentage of `sent`, or "0%" when nothing was sent. */
function rate(part: number, whole: number): string {
  if (whole <= 0) return "0%";
  return `${Math.round((part / whole) * 1000) / 10}%`;
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
}
