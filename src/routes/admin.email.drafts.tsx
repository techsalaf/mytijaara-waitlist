import { createFileRoute, Link } from "@tanstack/react-router";
import { EmptyState, SectionCard } from "@/components/admin/ui-bits";
import { campaigns } from "@/lib/mock-data";
import { FileEdit, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/email/drafts")({
  component: () => {
    const drafts = campaigns.filter((c) => c.status === "draft");
    return (
      <SectionCard title="Drafts" description={`${drafts.length} in progress`}>
        {drafts.length === 0 ? (
          <EmptyState icon={FileEdit} title="No drafts" description="Start a new campaign to save it as a draft." action={<Button asChild><Link to="/admin/email/builder">New campaign</Link></Button>} />
        ) : (
          <div className="space-y-2">
            {drafts.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border/60 p-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-muted"><FileEdit className="h-4 w-4" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{c.subject}</div>
                </div>
                <Button asChild variant="outline" size="sm"><Link to="/admin/email/builder"><Pencil className="mr-1 h-3 w-3" /> Continue</Link></Button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    );
  },
});
