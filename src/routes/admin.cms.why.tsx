import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { SectionCard } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { GripVertical, Plus, Trash2, Loader2, Save } from "lucide-react";
import { useCmsSection } from "@/lib/hooks/useCmsSection";

type WhyPoint = { title: string; description?: string };
type WhyData = { heading?: string; subheading?: string; points?: WhyPoint[] };

const defaultWhyData: WhyData = { heading: "", subheading: "", points: [] };

export const Route = createFileRoute("/admin/cms/why")({
  component: WhyEditor,
});

function WhyEditor() {
  const { data, setData, enabled, setEnabled, loading, saving, save } = useCmsSection<WhyData>(
    "why",
    defaultWhyData,
  );

  const points = useMemo(() => data.points ?? [], [data.points]);

  const updatePoint = (index: number, patch: Partial<WhyPoint>) =>
    setData({ ...data, points: points.map((p, i) => (i === index ? { ...p, ...patch } : p)) });

  const addPoint = () =>
    setData({ ...data, points: [...points, { title: "", description: "" }] });

  const removePoint = (index: number) =>
    setData({ ...data, points: points.filter((_, i) => i !== index) });

  return (
    <div className="space-y-4">
      <SectionCard
        title="Why MyTijaara section"
        description="Heading, subheading and value-proposition points"
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

          <div className="space-y-3">
            <div>
              <Label className="text-xs">Heading</Label>
              <Input
                value={data.heading ?? ""}
                onChange={(e) => setData({ ...data, heading: e.target.value })}
                className="mt-1"
                placeholder="Why MyTijaara?"
              />
            </div>
            <div>
              <Label className="text-xs">Subheading</Label>
              <Textarea
                value={data.subheading ?? ""}
                onChange={(e) => setData({ ...data, subheading: e.target.value })}
                className="mt-1 min-h-[72px] resize-none"
                placeholder="Supporting sentence under the heading"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Value points</Label>
            {points.map((pt, index) => (
              <div key={index} className="flex items-start gap-3 rounded-xl border border-border/60 p-3">
                <button className="mt-1 cursor-grab text-muted-foreground" aria-label="Drag to reorder">
                  <GripVertical className="h-4 w-4" />
                </button>
                <div className="grid flex-1 gap-2">
                  <div>
                    <Label className="text-xs">Title</Label>
                    <Input
                      value={pt.title ?? ""}
                      onChange={(e) => updatePoint(index, { title: e.target.value })}
                      className="mt-1 h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Description</Label>
                    <Input
                      value={pt.description ?? ""}
                      onChange={(e) => updatePoint(index, { description: e.target.value })}
                      className="mt-1 h-8"
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-500"
                  onClick={() => removePoint(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={addPoint}>
              <Plus className="mr-2 h-4 w-4" /> Add point
            </Button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
