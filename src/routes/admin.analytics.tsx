import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, StatCard, SectionCard } from "@/components/admin/ui-bits";
import { Users, MousePointerClick, TrendingUp, Percent, Globe, Chrome } from "lucide-react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { signupTrend, deviceBreakdown, browserBreakdown, cityBreakdown, funnel } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Calendar, Download } from "lucide-react";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({ meta: [{ title: "Analytics — MyTijaara Admin" }, { name: "robots", content: "noindex" }] }),
  component: Analytics,
});

function Analytics() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Deep dive into your visitor and signup performance."
        actions={
          <>
            <Button variant="outline" size="sm"><Calendar className="mr-2 h-4 w-4" /> Last 30 days</Button>
            <Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4" /> Export</Button>
          </>
        }
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Visitors" value="48,210" delta={22.4} icon={Users} />
        <StatCard label="Signups" value="2,847" delta={18.4} icon={TrendingUp} />
        <StatCard label="Conversion" value="5.9%" delta={0.7} icon={Percent} />
        <StatCard label="CTA clicks" value="12,480" delta={12.8} icon={MousePointerClick} />
      </div>

      <SectionCard title="Visitors & signups (30 days)">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={signupTrend.map((d) => ({ ...d, visitors: d.signups * 12 + Math.floor(Math.random() * 100) }))}>
              <defs>
                <linearGradient id="visG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
              <Area type="monotone" dataKey="visitors" stroke="var(--primary)" fill="url(#visG)" strokeWidth={2.5} />
              <Line type="monotone" dataKey="signups" stroke="var(--gold)" strokeWidth={2.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <SectionCard title="Conversion funnel" description="Landing → signup journey">
        <div className="space-y-3">
          {funnel.map((f, i) => (
            <div key={i}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium">{f.stage}</span>
                <span className="text-muted-foreground">{f.value.toLocaleString()} · {f.pct}%</span>
              </div>
              <div className="h-8 overflow-hidden rounded-lg bg-muted">
                <div className="flex h-full items-center justify-end bg-gradient-to-r from-primary to-[color-mix(in_oklab,var(--primary)_75%,black)] px-3 text-xs font-semibold text-white" style={{ width: `${f.pct}%` }}>
                  {f.pct}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Devices">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={deviceBreakdown} dataKey="value" nameKey="name" innerRadius={40} outerRadius={80}>
                  {deviceBreakdown.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
        <SectionCard title="Browsers" actions={<Chrome className="h-4 w-4 text-muted-foreground" />}>
          <div className="space-y-3">
            {browserBreakdown.map((b) => (
              <div key={b.name}>
                <div className="mb-1 flex justify-between text-xs"><span>{b.name}</span><span className="font-semibold">{b.value}%</span></div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full" style={{ width: `${b.value}%`, background: b.color }} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Cities" actions={<Globe className="h-4 w-4 text-muted-foreground" />}>
          <div className="space-y-3">
            {cityBreakdown.map((c) => (
              <div key={c.city} className="flex items-center justify-between text-sm">
                <span className="font-medium">{c.city}</span>
                <span className="text-muted-foreground">{c.users} · <span className="text-emerald-600">+{c.growth}%</span></span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
