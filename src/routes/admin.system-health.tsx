import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { PageHeader, SectionCard } from "@/components/admin/ui-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Clock,
  Database,
  HardDrive,
  ListChecks,
  Loader2,
  Mail,
  RefreshCw,
  Server,
  Zap,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { healthApi, type HealthCheck, type HealthSample, type SystemHealth } from "@/lib/api";

export const Route = createFileRoute("/admin/system-health")({
  head: () => ({
    meta: [{ title: "System Health — MyTijaara Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: HealthPage,
});

/** Probe key to icon. An unknown key still renders, with a neutral icon. */
const ICONS: Record<string, typeof Server> = {
  database: Database,
  cache: Zap,
  queue: ListChecks,
  storage: HardDrive,
  mail: Mail,
};

const STATUS_STYLES: Record<HealthCheck["status"], { badge: string; dot: string; label: string }> = {
  ok: { badge: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500", label: "operational" },
  degraded: { badge: "bg-gold/15 text-gold-foreground", dot: "bg-gold", label: "degraded" },
  down: { badge: "bg-red-50 text-red-700", dot: "bg-red-500", label: "down" },
};

/** Seconds to a short human string. Deterministic, no locale surprises. */
function humanDuration(seconds: number | null): string {
  if (seconds === null) return "unknown";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

function humanBytes(bytes: number | null): string {
  if (bytes === null) return "unknown";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value < 10 && unit > 0 ? 1 : 0)} ${units[unit]}`;
}

function HealthPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [samples, setSamples] = useState<HealthSample[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      // The probe runs first so the sample it records is included in history.
      const probe = await healthApi.get();
      setHealth(probe.data);
      const history = await healthApi.history(24);
      setSamples(history.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach the health endpoint");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="System Health" description="Running live probes…" />
        <div className="grid min-h-[40vh] place-items-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !health) {
    return (
      <div className="space-y-6">
        <PageHeader title="System Health" description="The health endpoint did not respond." />
        <SectionCard>
          <div className="space-y-3 py-8 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
            <p className="text-sm text-destructive">{error ?? "No health data returned."}</p>
            <p className="text-xs text-muted-foreground">
              If the API itself is down, this page cannot tell you more than that.
            </p>
            <Button size="sm" variant="outline" onClick={() => void load()}>
              Try again
            </Button>
          </div>
        </SectionCard>
      </div>
    );
  }

  const overall = STATUS_STYLES[health.status];
  const chart = samples.map((s) => ({
    at: s.at ? new Date(s.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
    db: s.dbLatencyMs,
    cache: s.cacheLatencyMs,
    storage: s.storageLatencyMs,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Health"
        description={
          health.status === "ok"
            ? `All probes healthy · measured ${new Date(health.checkedAt).toLocaleTimeString()}`
            : `${health.checks.filter((c) => c.status !== "ok").length} probe(s) need attention · measured ${new Date(health.checkedAt).toLocaleTimeString()}`
        }
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() => void load(true)}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Re-run probes
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
        <Badge className={overall.badge}>
          <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${overall.dot}`} />
          {overall.label}
        </Badge>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" /> Healthy for {humanDuration(health.uptimeSeconds)}
        </span>
        <span className="text-xs text-muted-foreground">
          {health.errors.lastHour} error{health.errors.lastHour === 1 ? "" : "s"} in the last hour ·{" "}
          {health.errors.last24h} in 24h ({health.errors.rate}/hr)
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {health.checks.map((check) => {
          const Icon = ICONS[check.key] ?? Server;
          const style = STATUS_STYLES[check.status];
          return (
            <div
              key={check.key}
              className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <Badge className={style.badge}>
                  <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${style.dot}`} />
                  {style.label}
                </Badge>
              </div>
              <div className="mt-3 text-base font-semibold">{check.label}</div>
              <div className="text-xs text-muted-foreground">
                {check.latencyMs === null ? "did not complete" : `${check.latencyMs}ms`}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{check.detail}</p>
            </div>
          );
        })}
      </div>

      <SectionCard
        title="Probe latency (24h)"
        description="Recorded on every probe run. The chart fills in as the page is opened over time."
      >
        {chart.length < 2 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Only {chart.length} sample recorded so far. Re-run the probes, or come back once more
            history exists.
          </p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="at"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  unit="ms"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="db"
                  name="Database"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  dot={false}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="cache"
                  name="Cache"
                  stroke="#0891b2"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="storage"
                  name="Storage"
                  stroke="#D4A017"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Queue" description="Read from the jobs and failed_jobs tables.">
          <dl className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Pending</dt>
              <dd className="text-2xl font-semibold">{health.queue.pending}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Failed</dt>
              <dd
                className={
                  "text-2xl font-semibold " + (health.queue.failed > 0 ? "text-destructive" : "")
                }
              >
                {health.queue.failed}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Oldest pending</dt>
              <dd className="text-2xl font-semibold">
                {health.queue.oldestPendingSeconds === null
                  ? "—"
                  : humanDuration(health.queue.oldestPendingSeconds)}
              </dd>
            </div>
          </dl>
          {health.queue.failed > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Retry them with <code>php artisan queue:retry all</code>.
            </p>
          )}
        </SectionCard>

        <SectionCard title="Storage" description="Free space on the configured disk.">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Writable</dt>
              <dd className="text-2xl font-semibold">
                {health.storage.writable ? "Yes" : <span className="text-destructive">No</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Free space</dt>
              <dd className="text-2xl font-semibold">{humanBytes(health.storage.freeBytes)}</dd>
            </div>
          </dl>
          {!health.storage.writable && (
            <p className="mt-3 text-xs text-destructive">
              Uploads and the media library will fail until the disk is writable.
            </p>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
