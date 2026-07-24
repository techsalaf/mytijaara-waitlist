import { createFileRoute } from "@tanstack/react-router";
import { SectionCard } from "@/components/admin/ui-bits";
import { emailTemplates } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Mail, Plus, Copy, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/email/templates")({
  component: () => (
    <SectionCard title="Email templates" description="Reusable email designs" actions={<Button size="sm" className="bg-[#0D7A46] hover:bg-[#166534]"><Plus className="mr-2 h-4 w-4" /> New template</Button>}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {emailTemplates.map((t) => (
          <div key={t.id} className="overflow-hidden rounded-xl border border-border/60 bg-white shadow-sm">
            <div className="grid aspect-video place-items-center bg-gradient-to-br from-[#0D7A46] to-[#166534] text-white">
              <Mail className="h-8 w-8 opacity-70" />
            </div>
            <div className="p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">{t.name}</div>
                <Badge variant="secondary" className="capitalize">{t.category}</Badge>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">Updated {t.updatedAt}</div>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1"><Pencil className="mr-1 h-3 w-3" /> Edit</Button>
                <Button variant="outline" size="sm"><Copy className="h-3 w-3" /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  ),
});
