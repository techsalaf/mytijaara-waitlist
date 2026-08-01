import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SectionCard, StatCard } from "@/components/admin/ui-bits";
import { campaignsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Eye, MousePointerClick, Send, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export const Route = createFileRoute("/admin/email/$id")({
  loader: async ({ params }) => {
    const [campaignResponse, statsResponse] = await Promise.all([
      campaignsApi.get(params.id),
      campaignsApi.stats(params.id),
    ]);
    if (!campaignResponse.data) throw notFound();
    return { campaign: campaignResponse.data, stats: statsResponse.data };
  },
  notFoundComponent: () => (
    <div className="rounded-xl border border-border/60 bg-card p-10 text-center">
      <p>Campaign not found.</p>
      <Button asChild variant="link">
        <Link to="/admin/email">Back to campaigns</Link>
      </Button>
    </div>
  ),
  component: CampaignDetail,
});

function CampaignDetail() {
  const { campaign, stats } = Route.useLoaderData();
  const c = campaign;
  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/admin/email">
          <ArrowLeft className="mr-1 h-3 w-3" /> Back
        </Link>
      </Button>
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{c.name}</h1>
          <Badge className="bg-emerald-50 text-emerald-700 capitalize">{c.status}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{c.subject}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Delivered" value={stats.sent.toLocaleString()} icon={Send} />
        <StatCard label="Open rate" value={stats.openRate.toFixed(1) + "%"} icon={Eye} />
        <StatCard
          label="Click rate"
          value={stats.clickRate.toFixed(1) + "%"}
          icon={MousePointerClick}
        />
        <StatCard label="Bounces" value={(stats.bounces ?? 0).toLocaleString()} icon={TrendingUp} />
      </div>

      <SectionCard title="Campaign engagement">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { metric: "Delivered", value: stats.sent },
                { metric: "Opened", value: stats.opens },
                { metric: "Clicked", value: stats.clicks },
                { metric: "Bounced", value: stats.bounces ?? 0 },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="metric"
                tick={{ fontSize: 10, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
              />
              <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
    </div>
  );
}
