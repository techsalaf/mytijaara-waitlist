import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SectionCard, StatCard } from "@/components/admin/ui-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { campaignsApi } from "@/lib/api";
import type { Campaign } from "@/lib/types";
import { Mail, Eye, MousePointerClick, Send } from "lucide-react";

export const Route = createFileRoute("/admin/email/")({
  component: EmailCampaigns,
});

function EmailCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  useEffect(() => {
    void campaignsApi.list().then((response) => setCampaigns(response.data));
  }, []);
  const sent = campaigns.reduce((total, campaign) => total + campaign.sent, 0);
  const opens = campaigns.reduce((total, campaign) => total + campaign.opens, 0);
  const clicks = campaigns.reduce((total, campaign) => total + campaign.clicks, 0);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total sent" value={sent.toLocaleString()} delta={0} icon={Send} />
        <StatCard
          label="Open rate"
          value={sent ? `${((opens / sent) * 100).toFixed(1)}%` : "0%"}
          delta={0}
          icon={Eye}
        />
        <StatCard
          label="Click rate"
          value={sent ? `${((clicks / sent) * 100).toFixed(1)}%` : "0%"}
          delta={0}
          icon={MousePointerClick}
        />
        <StatCard label="Campaigns" value={campaigns.length} delta={0} icon={Mail} />
      </div>

      <SectionCard title="All campaigns" description={`${campaigns.length} total`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="pb-2 font-medium">Campaign</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium text-right">Sent</th>
                <th className="pb-2 font-medium text-right">Opens</th>
                <th className="pb-2 font-medium text-right">Clicks</th>
                <th className="pb-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-t border-border/40">
                  <td className="py-3">
                    <Link to="/admin/email/$id" params={{ id: c.id }} className="block">
                      <div className="font-medium hover:text-primary">{c.name}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-md">
                        {c.subject}
                      </div>
                    </Link>
                  </td>
                  <td className="py-3">
                    <Badge
                      className={
                        c.status === "sent"
                          ? "bg-emerald-50 text-emerald-700"
                          : c.status === "scheduled"
                            ? "bg-gold/15 text-gold-foreground"
                            : "bg-muted text-muted-foreground"
                      }
                    >
                      {c.status}
                    </Badge>
                  </td>
                  <td className="py-3 text-right">{c.sent.toLocaleString()}</td>
                  <td className="py-3 text-right">
                    {c.opens ? `${((c.opens / c.sent) * 100).toFixed(1)}%` : "—"}
                  </td>
                  <td className="py-3 text-right">
                    {c.clicks ? `${((c.clicks / c.sent) * 100).toFixed(1)}%` : "—"}
                  </td>
                  <td className="py-3 text-xs text-muted-foreground">{c.sentAt || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
