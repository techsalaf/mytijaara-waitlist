import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/admin/ui-bits";
import { Badge } from "@/components/ui/badge";
import { Server, Database, HardDrive, ListChecks, Zap, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export const Route = createFileRoute("/admin/system-health")({
  head: () => ({ meta: [{ title: "System Health — MyTijaara Admin" }, { name: "robots", content: "noindex" }] }),
  component: HealthPage,
});

const statuses = [
  { label: "API server", icon: Server, status: "operational", metric: "42ms avg" },
  { label: "Database", icon: Database, status: "operational", metric: "8.2ms avg" },
  { label: "Queue", icon: ListChecks, status: "operational", metric: "0 backlog" },
  { label: "Cache", icon: Zap, status: "degraded", metric: "98.1% hit" },
  { label: "Storage", icon: HardDrive, status: "operational", metric: "68% used" },
];

const perf = Array.from({ length: 24 }, (_, i) => ({ h: `${i}h`, latency: 30 + Math.floor(Math.random() * 40), uptime: 99.9 - Math.random() * 0.4 }));

function HealthPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="System Health"
        description="All systems operational · 99.98% uptime this month"
        actions={<Button size="sm" variant="outline"><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statuses.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#0D7A46]/10 text-[#0D7A46]">
                <s.icon className="h-5 w-5" />
              </div>
              <Badge className={
                s.status === "operational" ? "bg-emerald-50 text-emerald-700" :
                s.status === "degraded" ? "bg-[#D4A017]/15 text-[#8a6b0f]" :
                "bg-red-50 text-red-700"
              }>
                <span className={"mr-1 inline-block h-1.5 w-1.5 rounded-full " + (
                  s.status === "operational" ? "bg-emerald-500" :
                  s.status === "degraded" ? "bg-[#D4A017]" : "bg-red-500"
                )} />
                {s.status}
              </Badge>
            </div>
            <div className="mt-3 text-base font-semibold">{s.label}</div>
            <div className="text-xs text-muted-foreground">{s.metric}</div>
          </div>
        ))}
      </div>

      <SectionCard title="API latency (24h)">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={perf}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="h" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
              <Line type="monotone" dataKey="latency" stroke="#0D7A46" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <SectionCard title="Storage">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span>218 MB used of 500 MB</span>
          <span className="font-semibold">44%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-gradient-to-r from-[#0D7A46] to-[#166534]" style={{ width: "44%" }} />
        </div>
      </SectionCard>
    </div>
  );
}
