import { createFileRoute } from "@tanstack/react-router";
import { SectionCard } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Database, HardDrive, RotateCcw, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/settings/system")({
  component: () => (
    <div className="space-y-4">
      <SectionCard title="Backups">
        <div className="flex items-center justify-between rounded-xl border border-border/60 p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><Database className="h-5 w-5" /></div>
            <div>
              <div className="font-semibold text-sm">Daily backups</div>
              <div className="text-xs text-muted-foreground">Last backup: 3 hours ago · Retention 30 days</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm"><RotateCcw className="mr-2 h-3 w-3" /> Restore</Button>
            <Switch defaultChecked />
          </div>
        </div>
      </SectionCard>
      <SectionCard title="Cache">
        <div className="flex items-center justify-between rounded-xl border border-border/60 p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-muted"><HardDrive className="h-5 w-5" /></div>
            <div>
              <div className="font-semibold text-sm">Application cache</div>
              <div className="text-xs text-muted-foreground">218 MB · 98.1% hit rate</div>
            </div>
          </div>
          <Button variant="outline" size="sm"><Trash2 className="mr-2 h-3 w-3" /> Purge cache</Button>
        </div>
      </SectionCard>
      <SectionCard title="Danger zone">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="font-semibold text-red-700 text-sm">Delete workspace</div>
          <div className="mt-1 text-xs text-red-600">This will permanently delete all data, users, and campaigns. This action cannot be undone.</div>
          <Button variant="destructive" size="sm" className="mt-3">Delete workspace</Button>
        </div>
      </SectionCard>
    </div>
  ),
});
