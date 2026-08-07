import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { SectionCard, StatCard } from "@/components/admin/ui-bits";
import { campaignsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Eye, Loader2, MousePointerClick, Send, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { Campaign } from "@/lib/types";
import type { CampaignStats } from "@/lib/api/campaigns";

/**
 * Campaign detail page. Uses client-side fetching (not an SSR loader) because
 * the admin API requires a Bearer token that only exists in the browser's
 * localStorage — a server-side loader has no token and always gets 401.
 */
export const Route = createFileRoute("/admin/email/$id")({
  component: CampaignDetail,
});

function CampaignDetail() {
  const { id } = useParams({ from: "/admin/email/$id" });

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cr, sr] = await Promise.all([
        campaignsApi.get(id),
        campaignsApi.stats(id),
      ]);
      setCampaign(cr.data);
      setStats(sr.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load campaign.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return (
      <div className="grid min-h-[40vh] place-items-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error || !campaign || !stats) {
    return (
      <div className="rounded-xl border border-border/60 bg-card p-10 text-center space-y-3">
        <p className="text-sm text-destructive">{error ?? "Campaign not found."}</p>
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/email">
            <ArrowLeft className="mr-1 h-3 w-3" /> Back to campaigns
          </Link>
        </Button>
      </div>
    );
  }

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
