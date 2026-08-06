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

type BuiltForNigeriansData = {
  heading?: string;
  body?: string;
  points?: string[];
};

const defaultData: BuiltForNigeriansData = { heading: "", body: "", points: [] };

export const Route = createFileRoute("/admin/cms/built-for-nigerians")({
  component: BuiltForNigeriansEditor,
});

function BuiltForNigeriansEditor() {
  const { data, setData, enabled, setEnabled, loading, saving, save } =
    useCmsSection<BuiltForNigeriansData>("built_for_nigerians", defaultData);

  const points = useMemo(() => data.points ?? [], [data.points]);

  const updatePoint = (index: number, value: string) =>
    setData({ ...data, points: points.map((p, i) => (i === index ? value : p)) });

  const addPoint = () => setData({ ...data, points: [...points, ""] });

  const removePoint = (index: number) =>
    setData({ ...data, points: points.filter((_, i) => i !== index) });

  return (
    <div className="space-y-4">
      <SectionCard
        title="Built for Nigerians section"
        description="Heading, body copy and bullet points"
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
              placeholder="Built for Nigerians."
            />
          </div>
          <div>
            <Label className="text-xs">Body copy</Label>
            <Textarea
              value={data.body ?? ""}
              onChange={(e) => setData({ ...data, body: e.target.value })}
              className="mt-1 min-h-[96px] resize-none"
              placeholder="Supporting paragraph under the heading"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Bullet points</Label>
            {points.map((pt, index) => (
              <div key={index} className="flex items-center gap-3">
                <button className="cursor-grab text-muted-foreground" aria-label="Drag to reorder">
                  <GripVertical className="h-4 w-4" />
                </button>
                <Input
                  value={pt}
                  onChange={(e) => updatePoint(index, e.target.value)}
                  className="h-8 flex-1"
                  placeholder={`Point ${index + 1}`}
                />
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

          <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            The emoji cards (Naira, Pidgin, etc.) are hardcoded and cannot be changed via the CMS.
          </p>
        </div>
      </SectionCard>
    </div>
  );
}
