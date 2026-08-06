import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { SectionCard } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { GripVertical, Plus, Trash2, Loader2, Save } from "lucide-react";
import { useCmsSection } from "@/lib/hooks/useCmsSection";

type HowStep = { title: string; description?: string };
type HowData = { heading?: string; steps?: HowStep[] };

const defaultHowData: HowData = { heading: "", steps: [] };

export const Route = createFileRoute("/admin/cms/how")({
  component: HowEditor,
});

function HowEditor() {
  const { data, setData, enabled, setEnabled, loading, saving, save } = useCmsSection<HowData>(
    "how",
    defaultHowData,
  );

  const steps = useMemo(() => data.steps ?? [], [data.steps]);

  const updateStep = (index: number, patch: Partial<HowStep>) =>
    setData({ ...data, steps: steps.map((s, i) => (i === index ? { ...s, ...patch } : s)) });

  const addStep = () =>
    setData({ ...data, steps: [...steps, { title: "", description: "" }] });

  const removeStep = (index: number) =>
    setData({ ...data, steps: steps.filter((_, i) => i !== index) });

  return (
    <div className="space-y-4">
      <SectionCard
        title="How it works section"
        description="Heading and numbered steps shown on the landing page"
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
            <Label className="text-xs">Heading</Label>
            <Input
              value={data.heading ?? ""}
              onChange={(e) => setData({ ...data, heading: e.target.value })}
              className="mt-1"
              placeholder="Three taps. That's it."
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Steps (displayed in order)</Label>
            {steps.map((step, index) => (
              <div key={index} className="flex items-start gap-3 rounded-xl border border-border/60 p-3">
                <button className="mt-1 cursor-grab text-muted-foreground" aria-label="Drag to reorder">
                  <GripVertical className="h-4 w-4" />
                </button>
                <span className="mt-1.5 text-xs font-bold text-primary w-5 shrink-0">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="grid flex-1 gap-2">
                  <div>
                    <Label className="text-xs">Title</Label>
                    <Input
                      value={step.title ?? ""}
                      onChange={(e) => updateStep(index, { title: e.target.value })}
                      className="mt-1 h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Description</Label>
                    <Input
                      value={step.description ?? ""}
                      onChange={(e) => updateStep(index, { description: e.target.value })}
                      className="mt-1 h-8"
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-500"
                  onClick={() => removeStep(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={addStep}>
              <Plus className="mr-2 h-4 w-4" /> Add step
            </Button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
