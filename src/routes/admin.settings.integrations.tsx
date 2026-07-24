import { createFileRoute } from "@tanstack/react-router";
import { SectionCard } from "@/components/admin/ui-bits";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Activity, MousePointerClick } from "lucide-react";

const items = [
  { icon: BarChart3, name: "Google Analytics 4", field: "Measurement ID", value: "G-XXXXXXXXXX", on: true },
  { icon: MousePointerClick, name: "Meta Pixel", field: "Pixel ID", value: "123456789012345", on: true },
  { icon: Activity, name: "Microsoft Clarity", field: "Project ID", value: "abcd1234", on: false },
];

export const Route = createFileRoute("/admin/settings/integrations")({
  component: () => (
    <div className="space-y-4">
      {items.map((it) => (
        <SectionCard key={it.name} title={it.name} actions={<Switch defaultChecked={it.on} />}>
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-muted"><it.icon className="h-5 w-5" /></div>
            <div className="flex-1">
              <Label className="text-xs">{it.field}</Label>
              <Input defaultValue={it.value} className="mt-1" />
            </div>
            {it.on && <Badge className="bg-emerald-50 text-emerald-700">Active</Badge>}
          </div>
        </SectionCard>
      ))}
    </div>
  ),
});
