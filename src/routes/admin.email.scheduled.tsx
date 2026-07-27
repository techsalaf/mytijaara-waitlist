import { createFileRoute } from "@tanstack/react-router";
import { SectionCard } from "@/components/admin/ui-bits";
import { campaigns } from "@/lib/mock-data";
import { Clock, Users } from "lucide-react";

export const Route = createFileRoute("/admin/email/scheduled")({
  component: () => {
    const list = campaigns.filter((c) => c.status === "scheduled");
    return (
      <SectionCard title="Scheduled campaigns" description={`${list.length} queued for send`}>
        <div className="space-y-2">
          {list.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border/60 p-4">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-gold/15 text-gold-foreground"><Clock className="h-5 w-5" /></div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.subject}</div>
              </div>
              <div className="text-right text-xs">
                <div className="font-medium">Sending {c.sentAt}</div>
                <div className="flex items-center gap-1 text-muted-foreground"><Users className="h-3 w-3" /> 2,847 recipients</div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    );
  },
});
