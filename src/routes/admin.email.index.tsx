import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { EmptyState, SectionCard, StatCard } from "@/components/admin/ui-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { campaignsApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import type { Campaign } from "@/lib/types";
import { Mail, Eye, MousePointerClick, Send, Copy, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/email/")({
  component: EmailCampaigns,
});

const STATUS_CLASS: Record<string, string> = {
  sent: "bg-emerald-50 text-emerald-700",
  scheduled: "bg-gold/15 text-gold-foreground",
  sending: "bg-blue-50 text-blue-700",
  draft: "bg-muted text-muted-foreground",
};

function EmailCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const r = await campaignsApi.list();
      setCampaigns(r.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.firstError : "Could not load campaigns.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const duplicate = async (id: string) => {
    setActingOn(id);
    try {
      const r = await campaignsApi.duplicate(id);
      setCampaigns((prev) => [...prev, r.data]);
      toast.success(`Duplicated as "${r.data.name}"`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.firstError : "Duplicate failed.");
    } finally {
      setActingOn(null);
    }
  };

  const remove = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setActingOn(id);
    try {
      await campaignsApi.remove(id);
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
      toast.success("Campaign deleted.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.firstError : "Delete failed.");
    } finally {
      setActingOn(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading campaigns…
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

  const sent = campaigns.reduce((t, c) => t + c.sent, 0);
  const opens = campaigns.reduce((t, c) => t + c.opens, 0);
  const clicks = campaigns.reduce((t, c) => t + c.clicks, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total sent" value={sent.toLocaleString()} icon={Send} />
        <StatCard
          label="Open rate"
          value={sent ? `${((opens / sent) * 100).toFixed(1)}%` : "0%"}
          icon={Eye}
        />
        <StatCard
          label="Click rate"
          value={sent ? `${((clicks / sent) * 100).toFixed(1)}%` : "0%"}
          icon={MousePointerClick}
        />
        <StatCard label="Campaigns" value={campaigns.length} icon={Mail} />
      </div>

      <SectionCard
        title="All campaigns"
        description={`${campaigns.length} total`}
        actions={
          <Button asChild size="sm" className="bg-primary hover:bg-primary/90">
            <Link to="/admin/email/builder">New campaign</Link>
          </Button>
        }
      >
        {campaigns.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="No campaigns yet"
            description="Create your first campaign to start engaging your waitlist."
            action={
              <Button asChild>
                <Link to="/admin/email/builder">New campaign</Link>
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border/60">
                <tr>
                  <th className="pb-3 pr-4 font-medium">Campaign</th>
                  <th className="pb-3 px-3 font-medium">Status</th>
                  <th className="pb-3 px-3 font-medium text-right">Sent</th>
                  <th className="pb-3 px-3 font-medium text-right">Open %</th>
                  <th className="pb-3 px-3 font-medium text-right">Click %</th>
                  <th className="pb-3 pl-4 pr-3 font-medium">Date</th>
                  <th className="pb-3 pl-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id} className="border-t border-border/40 hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 pr-4">
                      <Link to="/admin/email/$id" params={{ id: c.id }} className="block">
                        <div className="font-medium hover:text-primary">{c.name}</div>
                        <div className="max-w-md truncate text-xs text-muted-foreground">
                          {c.subject}
                        </div>
                      </Link>
                    </td>
                    <td className="py-3.5 px-3">
                      <Badge className={STATUS_CLASS[c.status] ?? STATUS_CLASS.draft}>
                        {c.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-xs">{c.sent.toLocaleString()}</td>
                    <td className="py-3.5 px-3 text-right font-mono text-xs">
                      {c.sent ? `${c.openRate.toFixed(1)}%` : "—"}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-xs">
                      {c.sent ? `${c.clickRate.toFixed(1)}%` : "—"}
                    </td>
                    <td className="py-3.5 pl-4 pr-3 text-xs text-muted-foreground whitespace-nowrap">
                      {c.sentAt ?? c.scheduledAt ?? "—"}
                    </td>
                    <td className="py-3.5 pl-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={actingOn === c.id}
                          title="Duplicate"
                          onClick={() => void duplicate(c.id)}
                        >
                          {actingOn === c.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          disabled={actingOn === c.id}
                          title="Delete"
                          onClick={() => void remove(c.id, c.name)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
