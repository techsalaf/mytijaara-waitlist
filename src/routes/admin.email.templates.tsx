import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SectionCard } from "@/components/admin/ui-bits";
import { templatesApi } from "@/lib/api";
import type { EmailTemplate } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Mail, Plus, Copy, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/email/templates")({
  component: EmailTemplates,
});

function EmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);

  useEffect(() => {
    void templatesApi.list().then((response) => setTemplates(response.data));
  }, []);

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
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Pencil className="mr-1 h-3 w-3" /> Edit
                </Button>
                <Button variant="outline" size="sm">
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
