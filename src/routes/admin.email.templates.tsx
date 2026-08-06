import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { EmptyState, SectionCard } from "@/components/admin/ui-bits";
import { templatesApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import type { EmailTemplate } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Mail, Plus, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/email/templates")({
  component: EmailTemplates,
});

function EmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const r = await templatesApi.list();
      setTemplates(r.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.firstError : "Could not load templates.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading templates…
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
    <SectionCard
      title="Email templates"
      description="Reusable email designs"
      actions={
        <Button size="sm" className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" /> New template
        </Button>
      }
    >
      {templates.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No templates yet"
          description="Create a reusable template to speed up campaign writing."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <div
              key={t.id}
              className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm"
            >
              <div className="grid aspect-video place-items-center bg-gradient-to-br from-primary to-[color-mix(in_oklab,var(--primary)_75%,black)] text-primary-foreground">
                <Mail className="h-8 w-8 opacity-70" />
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">{t.name}</div>
                  <Badge variant="secondary" className="capitalize">
                    {t.category}
                  </Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">Updated {t.updatedAt}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
