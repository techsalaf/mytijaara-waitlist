import { createFileRoute } from "@tanstack/react-router";
import { SectionCard } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Key, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";

const keys = [
  { name: "Production", key: "sk_live_9f2a...b1c7", created: "Jun 12, 2026", lastUsed: "2 min ago" },
  { name: "Staging", key: "sk_test_4d8e...9a2f", created: "Jun 12, 2026", lastUsed: "1h ago" },
  { name: "Mobile app", key: "sk_live_7b1c...3e9a", created: "May 3, 2026", lastUsed: "yesterday" },
];

export const Route = createFileRoute("/admin/settings/api-keys")({
  component: () => (
    <SectionCard title="API keys" description="Use these to authenticate backend requests." actions={<Button size="sm" className="bg-primary hover:bg-primary/90"><Plus className="mr-2 h-4 w-4" /> Generate key</Button>}>
      <div className="space-y-2">
        {keys.map((k) => (
          <div key={k.key} className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 p-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-muted"><Key className="h-4 w-4" /></div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{k.name}</span>
                <Badge variant="secondary">{k.created}</Badge>
              </div>
              <code className="mt-1 block truncate font-mono text-xs text-muted-foreground">{k.key}</code>
            </div>
            <div className="text-xs text-muted-foreground">Last used {k.lastUsed}</div>
            <Button variant="ghost" size="icon" onClick={() => { navigator.clipboard.writeText(k.key); toast.success("Copied"); }}><Copy className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="text-red-600"><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
    </SectionCard>
  ),
});
