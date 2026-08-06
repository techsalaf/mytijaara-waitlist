import { createFileRoute } from "@tanstack/react-router";
import { SectionCard } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save } from "lucide-react";
import { useCmsSection } from "@/lib/hooks/useCmsSection";

type PartnersData = { badge?: string; heading?: string; subheading?: string };

const defaultData: PartnersData = {
  badge: "Grow with us",
  heading: "A better way to earn.",
  subheading: "Vendors, riders and artisans — MyTijaara helps you find more customers.",
};

export const Route = createFileRoute("/admin/cms/partners")({
  component: PartnersEditor,
});

function PartnersEditor() {
  const { data, setData, enabled, setEnabled, loading, saving, save } =
    useCmsSection<PartnersData>("partners", defaultData);

  return (
    <div className="space-y-4">
      <SectionCard
        title="Partners section"
        description="Badge, heading and subheading above the vendor / rider / artisan cards"
        actions={
          <Button size="sm" onClick={save} disabled={loading || saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save changes
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
            <div>
              <div className="text-sm font-medium">Section enabled</div>
              <div className="text-xs text-muted-foreground">Toggle visibility on the landing page</div>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div>
            <Label className="text-xs">Badge text</Label>
            <Input
              value={data.badge ?? ""}
              onChange={(e) => setData({ ...data, badge: e.target.value })}
              className="mt-1"
              placeholder="Grow with us"
            />
          </div>
          <div>
            <Label className="text-xs">Heading</Label>
            <Input
              value={data.heading ?? ""}
              onChange={(e) => setData({ ...data, heading: e.target.value })}
              className="mt-1"
              placeholder="A better way to earn."
            />
          </div>
          <div>
            <Label className="text-xs">Subheading</Label>
            <Textarea
              value={data.subheading ?? ""}
              onChange={(e) => setData({ ...data, subheading: e.target.value })}
              className="mt-1 min-h-[80px] resize-none"
              placeholder="Supporting copy below the heading"
            />
          </div>

          <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            Partner cards (Vendor, Rider, Artisan) with their images, perks, and CTAs are hardcoded.
            Only the section header is CMS-controlled.
          </p>
        </div>
      </SectionCard>
    </div>
  );
}
