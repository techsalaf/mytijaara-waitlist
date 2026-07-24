import { createFileRoute } from "@tanstack/react-router";
import { SectionCard } from "@/components/admin/ui-bits";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

export const Route = createFileRoute("/admin/cms/")({
  component: HeroEditor,
});

function HeroEditor() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <SectionCard title="Hero content" description="The main above-the-fold section" className="lg:col-span-2">
        <div className="space-y-4">
          <div>
            <Label>Eyebrow tag</Label>
            <Input defaultValue="Coming to Nigeria" className="mt-1.5" />
          </div>
          <div>
            <Label>Headline</Label>
            <Input defaultValue="Everything you need, all in one place" className="mt-1.5" />
          </div>
          <div>
            <Label>Subheadline</Label>
            <Textarea rows={3} defaultValue="Order food, groceries and pharmacy items, book trusted artisans, send packages, rent cars and shop from businesses around you." className="mt-1.5" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Primary CTA label</Label>
              <Input defaultValue="Join the waitlist" className="mt-1.5" />
            </div>
            <div>
              <Label>Primary CTA URL</Label>
              <Input defaultValue="#join" className="mt-1.5" />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
            <div>
              <div className="text-sm font-medium">Show trust badges</div>
              <div className="text-xs text-muted-foreground">Display "2,400+ Nigerians on the list" strip</div>
            </div>
            <Switch defaultChecked />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Hero image">
        <div className="rounded-xl border-2 border-dashed border-border p-6 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-muted"><Upload className="h-5 w-5" /></div>
          <div className="mt-2 text-sm font-medium">Drop image here</div>
          <div className="text-xs text-muted-foreground">PNG, JPG up to 5MB</div>
          <Button variant="outline" size="sm" className="mt-3">Browse files</Button>
        </div>
        <div className="mt-4 space-y-2 text-xs">
          <div className="flex justify-between"><span className="text-muted-foreground">Current</span><span className="font-mono">hero-v4.png</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Size</span><span>1.2 MB</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Dimensions</span><span>1600×1200</span></div>
        </div>
      </SectionCard>
    </div>
  );
}
