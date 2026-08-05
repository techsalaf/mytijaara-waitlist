import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  Users,
  MousePointerClick,
  TrendingUp,
  Percent,
  Globe,
  Chrome,
  Download,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  AreaChart,
  Area,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";

import { PageHeader, StatCard, SectionCard, EmptyState } from "@/components/admin/ui-bits";
import { PeriodSelect } from "@/components/admin/period-select";
import { Button } from "@/components/ui/button";
import { analyticsApi, ApiError } from "@/lib/api";
import type { AnalyticsPeriod } from "@/lib/api/analytics";
import { periodCaption, periodGrowth, periodPhrase, trendDays } from "@/lib/admin/analytics-period";
import {
  analyticsExportFilename,
  analyticsExportRows,
  type AnalyticsSnapshot,
} from "@/lib/admin/analytics-export";
import { downloadCsv, toCsv } from "@/lib/csv";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({
    meta: [{ title: "Analytics — MyTijaara Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: Analytics,
});

function Analytics() {
  const [snapshot, setSnapshot] = useState<AnalyticsSnapshot | null>(null);
  const [period, setPeriod] = useState<AnalyticsPeriod>(30);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (selected: AnalyticsPeriod, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      // The window goes to every endpoint. All six calls used to be
      // argument-less, so the page always showed 30 days.
      const [stats, trend, devices, browsers, cities, funnel] = await Promise.all([
        analyticsApi.overview(selected),
        analyticsApi.trends(trendDays(selected)),
        analyticsApi.devices(selected),
        analyticsApi.browsers(selected),
        analyticsApi.cities(selected),
        analyticsApi.funnel(selected),
      ]);
      setSnapshot({
        period: selected,
        stats: stats.data,
        trend: trend.data,
        devices: devices.data,
        browsers: browsers.data,
        cities: cities.data,
        funnel: funnel.data,
      });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError
          : err instanceof Error
            ? err.message
            : "Could not load analytics.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(period, snapshot !== null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, load]);

  const exportCsv = () => {
    if (!snapshot) return;
    const rows = analyticsExportRows(snapshot);
    downloadCsv(
      analyticsExportFilename(snapshot.period),
      toCsv(rows, [
        { key: "section", label: "Section" },
        { key: "label", label: "Metric" },
        { key: "value", label: "Value" },
        { key: "detail", label: "Detail" },
      ]),
    );
    toast.success(`Exported ${rows.length} rows`);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Analytics" description="Loading visitor and signup performance…" />
        <div className="grid min-h-[40vh] place-items-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div className="space-y-6">
        <PageHeader title="Analytics" description="Analytics could not be loaded." />
        <SectionCard>
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-sm font-semibold">Could not load analytics</p>
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

  const { stats, trend, devices, browsers, cities, funnel } = snapshot;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description={`Visitor and signup performance for ${periodPhrase(period)}.`}
        actions={
          <>
            {refreshing && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <PeriodSelect value={period} onChange={setPeriod} disabled={refreshing} />
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={refreshing}>
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
          </>
        }
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Visitors"
          value={stats.visitors.toLocaleString()}
          icon={Users}
          hint={stats.visitors > 0 ? periodPhrase(period) : "no pageview events recorded yet"}
        />
        <StatCard
          label="Signups"
          value={stats.periodSignups.toLocaleString()}
          delta={
            period === 0
              ? undefined
              : periodGrowth(stats.periodSignups, stats.previousPeriodSignups)
          }
          icon={TrendingUp}
          hint={
            period === 0
              ? "all time"
              : `vs ${stats.previousPeriodSignups.toLocaleString()} previously`
          }
        />
        <StatCard
          label="Conversion"
          value={`${stats.conversionRate}%`}
          icon={Percent}
          hint={stats.visitors > 0 ? "signups / visitors" : "needs a pageview stream"}
        />
        <StatCard
          label="CTA clicks"
          value={stats.ctaClicks.toLocaleString()}
          icon={MousePointerClick}
          hint={periodPhrase(period)}
        />
      </div>

      <SectionCard
        title={periodCaption("Signups & verified users", period === 0 ? 90 : period)}
        description="Verified users are the gold line."
      >
        {trend.every((p) => p.signups === 0 && p.verified === 0) ? (
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
                  <linearGradient id="visG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
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
                  stroke="var(--primary)"
                  fill="url(#visG)"
                  strokeWidth={2.5}
                  name="Signups"
                />
                <Line
                  type="monotone"
                  dataKey="verified"
                  stroke="var(--gold)"
                  strokeWidth={2.5}
                  dot={false}
                  name="Verified"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Conversion funnel"
        description={periodCaption("Landing to signup journey", period)}
      >
        {funnel.length === 0 ? (
          <EmptyState
            illustration="chart"
            title="No funnel data"
            description="The funnel needs at least one signup in the selected window."
          />
        ) : (
          <div className="space-y-3">
            {funnel.map((f) => (
              <div key={f.stage}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">{f.stage}</span>
                  <span className="text-muted-foreground">
                    {f.value.toLocaleString()} · {f.pct}%
                  </span>
                </div>
                <div className="h-8 overflow-hidden rounded-lg bg-muted">
                  <div
                    className="flex h-full items-center justify-end bg-gradient-to-r from-primary to-[color-mix(in_oklab,var(--primary)_75%,black)] px-3 text-xs font-semibold text-primary-foreground"
                    style={{ width: `${f.pct}%` }}
                  >
                    {f.pct}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Devices" description={periodPhrase(period)}>
          {devices.length === 0 ? (
            <EmptyState
              illustration="chart"
              title="No device data"
              description="Device is detected from the signup request."
            />
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={devices}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={40}
                    outerRadius={80}
                  >
                    {devices.map((d) => (
                      <Cell key={d.name} fill={d.color} />
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
        <SectionCard
          title="Browsers"
          description={periodPhrase(period)}
          actions={<Chrome className="h-4 w-4 text-muted-foreground" />}
        >
          {browsers.length === 0 ? (
            <EmptyState
              illustration="chart"
              title="No browser data"
              description="Browser is parsed from the signup user agent."
            />
          ) : (
            <div className="space-y-3">
              {browsers.map((b) => (
                <div key={b.name}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span>{b.name}</span>
                    <span className="font-semibold">{b.value}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${b.value}%`, background: b.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
        <SectionCard
          title="Cities"
          description={periodPhrase(period)}
          actions={<Globe className="h-4 w-4 text-muted-foreground" />}
        >
          {cities.length === 0 ? (
            <EmptyState
              illustration="search"
              title="No cities recorded"
              description="City is captured on the waitlist form."
            />
          ) : (
            <div className="space-y-3">
              {cities.map((c) => (
                <div key={c.city} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{c.city}</span>
                  <span className="text-muted-foreground">
                    {c.users} ·{" "}
                    <span className={c.growth >= 0 ? "text-emerald-600" : "text-red-600"}>
                      {c.growth >= 0 ? "+" : ""}
                      {c.growth}%
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

/** Period-over-period growth lives in `@/lib/admin/analytics-period`. */
