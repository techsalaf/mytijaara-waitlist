import { createFileRoute } from "@tanstack/react-router";
import { SectionCard } from "@/components/admin/ui-bits";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

const swatches = [
  { name: "Primary", value: "#0D7A46" },
  { name: "Secondary", value: "#166534" },
  { name: "Accent", value: "#D4A017" },
  { name: "Background", value: "#F8FAF8" },
  { name: "Surface", value: "#FFFFFF" },
];

export const Route = createFileRoute("/admin/settings/branding")({
  component: () => (
    <div className="space-y-4">
      <SectionCard title="Logo & favicon">
        <div className="grid gap-4 sm:grid-cols-2">
          {["Primary logo", "Favicon"].map((l) => (
            <div key={l} className="rounded-xl border-2 border-dashed border-border/70 p-6 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-muted"><Upload className="h-5 w-5" /></div>
              <div className="mt-2 text-sm font-medium">{l}</div>
              <div className="text-xs text-muted-foreground">Drop file or</div>
              <Button variant="outline" size="sm" className="mt-2">Browse</Button>
            </div>
          ))}
        </div>
      </SectionCard>
      <SectionCard title="Brand colors" description="These control the entire admin and public site theme">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {swatches.map((s) => (
            <div key={s.name} className="flex items-center gap-3 rounded-xl border border-border/60 p-3">
              <div className="h-12 w-12 rounded-lg border" style={{ background: s.value }} />
              <div className="flex-1">
                <Label className="text-xs">{s.name}</Label>
                <Input defaultValue={s.value} className="mt-1 h-8 font-mono text-xs" />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
      <SectionCard title="Typography">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label>Display font</Label><Input defaultValue="Plus Jakarta Sans" className="mt-1.5" /></div>
          <div><Label>Body font</Label><Input defaultValue="Inter" className="mt-1.5" /></div>
        </div>
      </SectionCard>
    </div>
  ),
});
