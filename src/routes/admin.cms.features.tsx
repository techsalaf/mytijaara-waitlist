import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { SectionCard } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { GripVertical, Plus, Trash2, Loader2, Save } from "lucide-react";
import { useCmsSection } from "@/lib/hooks/useCmsSection";

type FeatureItem = {
  title?: string;
  description?: string;
  enabled?: boolean;
};

type FeaturesData = {
  heading?: string;
  subheading?: string;
  items?: FeatureItem[];
};

const defaultFeaturesData: FeaturesData = { heading: "", subheading: "", items: [] };

export const Route = createFileRoute("/admin/cms/features")({
  component: FeaturesEditor,
});

function FeaturesEditor() {
  const { data, setData, enabled, setEnabled, loading, saving, save } = useCmsSection<FeaturesData>(
    "services",
    defaultFeaturesData,
  );

  const features = useMemo(() => data.items ?? [], [data.items]);

  const updateFeature = (index: number, patch: Partial<FeatureItem>) =>
    setData({
      ...data,
      items: features.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    });

  const addFeature = () => setData({ ...data, items: [...features, { title: "", description: "", enabled: true }] });

  const removeFeature = (index: number) => setData({ ...data, items: features.filter((_, i) => i !== index) });

  return (
    <div className="space-y-4">
      <SectionCard
        title="Features grid"
        description="Reorder, edit or add features shown on the landing page"
        actions={
          <Button size="sm" onClick={save} disabled={loading || saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save changes
          </Button>
        }
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
            <div>
              <div className="text-sm font-medium">Features section enabled</div>
              <div className="text-xs text-muted-foreground">Toggle whether feature cards appear on the landing page</div>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          {/*
            The landing section renders `heading` and `subheading` above the
            grid. They were seeded and rendered but had no field here, so the
            two lines of copy at the top of "One app. All your errands." could
            not be changed from the admin panel at all.
          */}
          <div className="grid gap-2 rounded-xl border border-border/60 p-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Section heading</Label>
              <Input
                value={data.heading ?? ""}
                onChange={(e) => setData({ ...data, heading: e.target.value })}
                placeholder="One app. All your errands."
                className="mt-1 h-8"
              />
            </div>
            <div>
              <Label className="text-xs">Section subheading</Label>
              <Input
                value={data.subheading ?? ""}
                onChange={(e) => setData({ ...data, subheading: e.target.value })}
                placeholder="Stop jumping between five different apps."
                className="mt-1 h-8"
              />
            </div>
          </div>

          {features.map((feature, index) => (
            <div key={index} className="flex items-start gap-3 rounded-xl border border-border/60 p-3">
              <button className="mt-1 cursor-grab text-muted-foreground">
                <GripVertical className="h-4 w-4" />
              </button>
              <div className="grid flex-1 gap-2 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Title</Label>
                  <Input
                    value={feature.title ?? ""}
                    onChange={(e) => updateFeature(index, { title: e.target.value })}
                    className="mt-1 h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">Description</Label>
                  <Input
                    value={feature.description ?? ""}
                    onChange={(e) => updateFeature(index, { description: e.target.value })}
                    className="mt-1 h-8"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={Boolean(feature.enabled ?? true)}
                  onCheckedChange={(value) => updateFeature(index, { enabled: value })}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-500"
                  onClick={() => removeFeature(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={addFeature}>
            <Plus className="mr-2 h-4 w-4" /> Add feature
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}
