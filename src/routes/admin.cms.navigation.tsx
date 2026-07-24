import { createFileRoute } from "@tanstack/react-router";
import { SectionCard } from "@/components/admin/ui-bits";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { GripVertical, Plus, Trash2 } from "lucide-react";

const links = [
  { label: "Features", url: "#features" },
  { label: "Waitlist", url: "#join" },
  { label: "For vendors", url: "#vendors" },
  { label: "FAQs", url: "#faq" },
];

export const Route = createFileRoute("/admin/cms/navigation")({
  component: () => (
    <SectionCard title="Site navigation" description="Header menu links" actions={<Button size="sm"><Plus className="mr-2 h-4 w-4" /> Add link</Button>}>
      <div className="space-y-2">
        {links.map((l, i) => (
          <div key={i} className="flex items-center gap-2 rounded-lg border border-border/60 p-2">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <div className="grid flex-1 gap-2 sm:grid-cols-2">
              <div><Label className="text-xs">Label</Label><Input defaultValue={l.label} className="mt-1 h-8" /></div>
              <div><Label className="text-xs">URL</Label><Input defaultValue={l.url} className="mt-1 h-8" /></div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500"><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
    </SectionCard>
  ),
});
