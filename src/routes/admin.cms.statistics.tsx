import { createFileRoute } from "@tanstack/react-router";
import { SectionCard } from "@/components/admin/ui-bits";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/admin/cms/statistics")({
  component: () => (
    <SectionCard title="Statistics section" description="The impact numbers shown on the landing page" actions={<Button size="sm"><Plus className="mr-2 h-4 w-4" /> Add stat</Button>}>
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { label: "Nigerians on waitlist", value: "2,400+" },
          { label: "Cities at launch", value: "12" },
          { label: "Vendors onboarded", value: "180+" },
          { label: "Riders signed up", value: "500+" },
        ].map((s, i) => (
          <div key={i} className="rounded-xl border border-border/60 p-4">
            <div className="mb-3 flex items-center gap-2 text-primary"><TrendingUp className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-wider">Stat {i + 1}</span></div>
            <Label className="text-xs">Value</Label>
            <Input defaultValue={s.value} className="mt-1" />
            <Label className="mt-3 text-xs">Label</Label>
            <Input defaultValue={s.label} className="mt-1" />
          </div>
        ))}
      </div>
    </SectionCard>
  ),
});
