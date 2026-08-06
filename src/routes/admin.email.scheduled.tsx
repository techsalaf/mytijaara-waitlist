import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { EmptyState, SectionCard } from "@/components/admin/ui-bits";
import { campaignsApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import type { Campaign } from "@/lib/types";
import { Clock, Users, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/email/scheduled")({
  component: ScheduledCampaigns,
});

function ScheduledCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const r = await campaignsApi.list({ status: "scheduled" });
      setCampaigns(r.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.firstError : "Could not load scheduled campaigns.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  /** Cancelling a scheduled campaign reverts it to draft so it can be edited or re-scheduled. */
  const cancel = async (id: string, name: string) => {
    if (!window.confirm(`Cancel "${name}"? It will become a draft again.`)) return;
    setCancelling(id);
    try {
      await campaignsApi.update(id, { status: "draft", scheduledAt: null });
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
      toast.success("Campaign moved back to drafts.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.firstError : "Could not cancel.");
    } finally {
      setCancelling(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-center text-sm text-destructive">
        {error}
        <Button variant="link" className="ml-2 p-0 text-destructive" onClick={() => void load()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <SectionCard title="Scheduled campaigns" description={`${campaigns.length} queued for send`}>
      {campaigns.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="Nothing scheduled"
          description="Schedule a campaign from the builder to see it here."
          action={
            <Button asChild>
              <Link to="/admin/email/builder">New campaign</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {campaigns.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 rounded-xl border border-border/60 p-4"
            >
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-gold/15 text-gold-foreground">
                <Clock className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{c.name}</div>
                <div className="truncate text-xs text-muted-foreground">{c.subject}</div>
              </div>
              <div className="text-right text-xs">
                {/* scheduledAt is the correct field; sentAt is null until the campaign fires */}
                <div className="font-medium">
                  {c.scheduledAt
                    ? new Date(c.scheduledAt).toLocaleString()
                    : "Send time not set"}
                </div>
                <div className="flex items-center justify-end gap-1 text-muted-foreground">
                  <Users className="h-3 w-3" />
                  {c.sent > 0 ? `${c.sent.toLocaleString()} sent` : "Not yet sent"}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                disabled={cancelling === c.id}
                title="Cancel schedule"
                onClick={() => void cancel(c.id, c.name)}
              >
                {cancelling === c.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}


