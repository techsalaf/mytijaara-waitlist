import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SectionCard } from "@/components/admin/ui-bits";
import { campaignsApi } from "@/lib/api";
import type { Campaign } from "@/lib/types";
import { Clock, Users } from "lucide-react";

export const Route = createFileRoute("/admin/email/scheduled")({
  component: ScheduledCampaigns,
});

function ScheduledCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    void campaignsApi.list({ status: "scheduled" }).then((response) => setCampaigns(response.data));
  }, []);

  return (
    <SectionCard title="Scheduled campaigns" description={`${campaigns.length} queued for send`}>
      <div className="space-y-2">
        {campaigns.map((campaign) => (
          <div
            key={campaign.id}
            className="flex items-center gap-3 rounded-xl border border-border/60 p-4"
          >
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-gold/15 text-gold-foreground">
              <Clock className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">{campaign.name}</div>
              <div className="text-xs text-muted-foreground">{campaign.subject}</div>
            </div>
            <div className="text-right text-xs">
              <div className="font-medium">Sending {campaign.sentAt || "Not scheduled"}</div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Users className="h-3 w-3" /> {campaign.sent.toLocaleString()} recipients
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
