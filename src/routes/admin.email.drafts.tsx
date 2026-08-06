import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { EmptyState, SectionCard } from "@/components/admin/ui-bits";
import { campaignsApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import type { Campaign } from "@/lib/types";
import { FileEdit, Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/email/drafts")({
  component: Drafts,
});

function Drafts() {
  const [drafts, setDrafts] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const r = await campaignsApi.list({ status: "draft" });
      setDrafts(r.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.firstError : "Could not load drafts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const remove = async (id: string, name: string) => {
    if (!window.confirm(`Delete draft "${name}"?`)) return;
    setDeleting(id);
    try {
      await campaignsApi.remove(id);
      setDrafts((prev) => prev.filter((c) => c.id !== id));
      toast.success("Draft deleted.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.firstError : "Delete failed.");
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading drafts…
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
    <SectionCard title="Drafts" description={`${drafts.length} in progress`}>
      {drafts.length === 0 ? (
        <EmptyState
          icon={FileEdit}
          title="No drafts"
          description="Start a new campaign to save it as a draft."
          action={
            <Button asChild>
              <Link to="/admin/email/builder">New campaign</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {drafts.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 rounded-xl border border-border/60 p-3"
            >
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-muted">
                <FileEdit className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{c.name}</div>
                <div className="truncate text-xs text-muted-foreground">{c.subject}</div>
              </div>
              <div className="flex items-center gap-1">
                <Button asChild variant="outline" size="sm">
                  <Link to="/admin/email/$id" params={{ id: c.id }}>
                    <Pencil className="mr-1 h-3 w-3" /> Edit
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  disabled={deleting === c.id}
                  onClick={() => void remove(c.id, c.name)}
                >
                  {deleting === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Delete"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}


