import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SectionCard, StatCard } from "@/components/admin/ui-bits";
import { campaigns } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Eye, MousePointerClick, Send, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export const Route = createFileRoute("/admin/email/$id")({
  loader: ({ params }) => {
    const c = campaigns.find((x) => x.id === params.id);
    if (!c) throw notFound();
    return c;
  },
  notFoundComponent: () => (
    <div className="rounded-xl border border-border/60 bg-card p-10 text-center">
      <p>Campaign not found.</p>
      <Button asChild variant="link"><Link to="/admin/email">Back to campaigns</Link></Button>
    </div>
  ),
  component: CampaignDetail,
});

function CampaignDetail() {
  const c = Route.useLoaderData();
  const opens = c.sent ? ((c.opens / c.sent) * 100) : 0;
  const clicks = c.sent ? ((c.clicks / c.sent) * 100) : 0;
  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/admin/email"><ArrowLeft className="mr-1 h-3 w-3" /> Back</Link>
      </Button>
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{c.name}</h1>
          <Badge className="bg-emerald-50 text-emerald-700 capitalize">{c.status}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{c.subject}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Delivered" value={c.sent.toLocaleString()} icon={Send} />
        <StatCard label="Open rate" value={opens.toFixed(1) + "%"} delta={3.2} icon={Eye} />
        <StatCard label="Click rate" value={clicks.toFixed(1) + "%"} delta={1.4} icon={MousePointerClick} />
        <StatCard label="Bounce" value="0.4%" icon={TrendingUp} />
      </div>

      <SectionCard title="Engagement over time">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={Array.from({ length: 24 }, (_, i) => ({ h: `${i}:00`, opens: Math.floor(Math.random() * 60), clicks: Math.floor(Math.random() * 20) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="h" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
              <Bar dataKey="opens" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="clicks" fill="var(--gold)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
    </div>
  );
}
