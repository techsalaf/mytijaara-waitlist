import { createFileRoute } from "@tanstack/react-router";
import { SectionCard } from "@/components/admin/ui-bits";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Facebook, Instagram, Twitter, Youtube, Linkedin } from "lucide-react";

const rows = [
  { icon: Instagram, label: "Instagram", url: "https://instagram.com/mytijaara" },
  { icon: Twitter, label: "Twitter / X", url: "https://x.com/mytijaara" },
  { icon: Facebook, label: "Facebook", url: "https://facebook.com/mytijaara" },
  { icon: Youtube, label: "YouTube", url: "" },
  { icon: Linkedin, label: "LinkedIn", url: "https://linkedin.com/company/mytijaara" },
];

export const Route = createFileRoute("/admin/settings/social")({
  component: () => (
    <SectionCard title="Social profiles">
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-muted"><r.icon className="h-4 w-4" /></div>
            <div className="w-28 text-sm font-medium">{r.label}</div>
            <Input defaultValue={r.url} placeholder="https://…" className="flex-1" />
          </div>
        ))}
      </div>
    </SectionCard>
  ),
});
