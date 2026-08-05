import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { EmptyState, SectionCard, StatCard } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import { referralsApi, ApiError } from "@/lib/api";
import type { ReferralAnalytics } from "@/lib/types";
import { PeriodSelect } from "@/components/admin/period-select";
import { periodCaption, periodPhrase } from "@/lib/admin/analytics-period";
import type { AnalyticsPeriod } from "@/lib/api/analytics";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { Share2, MousePointerClick, Percent, Award, Loader2, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/admin/referrals/analytics")({
  component: ReferralAnalyticsPage,
});

const numberFormat = new Intl.NumberFormat("en-NG");
const formatNumber = (value: number) => numberFormat.format(value);

function ReferralAnalyticsPage() {
  const [analytics, setAnalytics] = useState<ReferralAnalytics | null>(null);
  const [period, setPeriod] = useState<AnalyticsPeriod>(30);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (selected: AnalyticsPeriod, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const response = await referralsApi.analytics(selected);
      setAnalytics(response.data);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError
          : err instanceof Error
            ? err.message
            : "Could not load referral analytics.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(period, analytics !== null);
    // `analytics` is read only to pick spinner vs inline refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, load]);

  // Reward runs change the "Rewards paid" card.
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

  if (error || !analytics) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-16 text-center">
        <AlertTriangle className="h-6 w-6 text-destructive" />
        <p className="text-sm font-medium text-destructive">
          {error ?? "Could not load referral analytics."}
        </p>
        <Button variant="outline" size="sm" onClick={() => void load(period)}>
          Retry
        </Button>
      </div>
    );
  }

  const signupTrend = analytics.trend;
  const hasTrend = signupTrend.some((point) => point.visits > 0 || point.signups > 0);
  const trafficSources = analytics.sources.map((source, index) => ({
    ...source,
    color: index % 2 ? "var(--gold)" : "var(--primary)",
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Referral link performance for {periodPhrase(period)}.
        </p>
        <div className="flex items-center gap-2">
          {refreshing && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <PeriodSelect value={period} onChange={setPeriod} disabled={refreshing} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Link clicks"
          value={formatNumber(analytics.totalVisits)}
          icon={MousePointerClick}
          hint={periodPhrase(period)}
        />
        <StatCard
          label="Conversions"
          value={formatNumber(analytics.conversions)}
          icon={Share2}
          hint="visits that became signups"
        />
        <StatCard
          label="Signup rate"
          value={`${analytics.conversionRate}%`}
          icon={Percent}
          hint={`of ${formatNumber(analytics.totalVisits)} clicks`}
        />
        <StatCard
          label="Rewards paid"
          value={analytics.rewards.amountPaidLabel}
          icon={Award}
          hint={`${formatNumber(analytics.rewards.paidReferrals)} referrals settled`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Referrals by channel"
          description={periodCaption("Clicks by UTM source", period)}
        >
          {trafficSources.length === 0 ? (
            <EmptyState
              illustration="chart"
              title="No channel data yet"
              description="Clicks are attributed once referral links carry a utm_source."
            />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trafficSources}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="name"
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
                  <Bar dataKey="value" fill="var(--primary)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Source distribution"
          description={periodCaption("Share of clicks", period)}
        >
          {trafficSources.length === 0 ? (
            <EmptyState
              illustration="chart"
              title="No sources yet"
              description="The split appears once tagged referral traffic arrives."
            />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={trafficSources}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {trafficSources.map((s, i) => (
                      <Cell key={i} fill={s.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title={periodCaption("Referral trend", period)}>
        {!hasTrend ? (
          <EmptyState
            illustration="chart"
            title="Nothing to plot yet"
            description="Clicks and signups appear here as they happen."
          />
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={signupTrend}>
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
                <Line
                  type="monotone"
                  dataKey="visits"
                  stroke="var(--gold)"
                  strokeWidth={2.5}
                  dot={false}
                  name="Clicks"
                />
                <Line
                  type="monotone"
                  dataKey="signups"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  dot={false}
                  name="Signups"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
