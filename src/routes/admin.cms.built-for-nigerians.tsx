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
  headingLive?: string;
  bodyLive?: string;
  pointsLive?: string[];
};

const defaultData: BuiltForNigeriansData = {
  heading: "",
  body: "",
  points: [],
  headingLive: "",
  bodyLive: "",
  pointsLive: [],
};

export const Route = createFileRoute("/admin/cms/built-for-nigerians")({
  component: BuiltForNigeriansEditor,
});

function BuiltForNigeriansEditor() {
  const { data, setData, enabled, setEnabled, loading, saving, save } =
    useCmsSection<BuiltForNigeriansData>("built_for_nigerians", defaultData);

  const points = useMemo(() => data.points ?? [], [data.points]);
  const pointsLive = useMemo(() => data.pointsLive ?? [], [data.pointsLive]);

  const updatePoint = (index: number, value: string) =>
    setData({ ...data, points: points.map((p, i) => (i === index ? value : p)) });

  const addPoint = () => setData({ ...data, points: [...points, ""] });

  const removePoint = (index: number) =>
    setData({ ...data, points: points.filter((_, i) => i !== index) });

  const updatePointLive = (index: number, value: string) =>
    setData({ ...data, pointsLive: pointsLive.map((p, i) => (i === index ? value : p)) });

  const addPointLive = () => setData({ ...data, pointsLive: [...pointsLive, ""] });

  const removePointLive = (index: number) =>
    setData({ ...data, pointsLive: pointsLive.filter((_, i) => i !== index) });

  return (
    <div className="space-y-6">
      <SectionCard
        title="Built for Nigerians section"
        description="Heading, body copy and bullet points across pre-launch and live states"
        actions={
          <Button size="sm" onClick={save} disabled={loading || saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save changes
          </Button>
        }
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
            <div>
              <div className="text-sm font-medium">Section enabled</div>
              <div className="text-xs text-muted-foreground">Toggle visibility on the landing page</div>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          {/* Pre-launch phase content */}
          <div className="rounded-2xl border border-border/70 p-5 space-y-4 bg-muted/20">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h3 className="text-sm font-bold text-foreground">Pre-Launch Copy (Waitlist Phase)</h3>
                <p className="text-xs text-muted-foreground">Shown while the countdown is actively ticking down</p>
              </div>
            </div>

            <div>
              <Label className="text-xs">Heading (Pre-Launch)</Label>
              <Input
                value={data.heading ?? ""}
                onChange={(e) => setData({ ...data, heading: e.target.value })}
                className="mt-1"
                placeholder="Made here. For here."
              />
            </div>
            <div>
              <Label className="text-xs">Body Copy (Pre-Launch)</Label>
              <Textarea
                value={data.body ?? ""}
                onChange={(e) => setData({ ...data, body: e.target.value })}
                className="mt-1 min-h-[80px] resize-none"
                placeholder="We know Nigerian streets, Nigerian shops, Nigerian tastes..."
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Bullet points (Pre-Launch)</Label>
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
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={addPoint}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add pre-launch point
              </Button>
            </div>
          </div>

          {/* Live phase content */}
          <div className="rounded-2xl border border-gold/40 p-5 space-y-4 bg-gold/5">
            <div className="flex items-center justify-between border-b border-gold/20 pb-3">
              <div>
                <h3 className="text-sm font-bold text-foreground">Live & Post-Launch Copy</h3>
                <p className="text-xs text-muted-foreground">Swapped in automatically once the launch countdown reaches zero</p>
              </div>
            </div>

            <div>
              <Label className="text-xs">Heading (Live)</Label>
              <Input
                value={data.headingLive ?? ""}
                onChange={(e) => setData({ ...data, headingLive: e.target.value })}
                className="mt-1"
                placeholder="Made here. For here."
              />
            </div>
            <div>
              <Label className="text-xs">Body Copy (Live)</Label>
              <Textarea
                value={data.bodyLive ?? ""}
                onChange={(e) => setData({ ...data, bodyLive: e.target.value })}
                className="mt-1 min-h-[80px] resize-none"
                placeholder="Powering everyday trade, hot food, artisans, and essentials..."
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Bullet points (Live)</Label>
              {pointsLive.map((pt, index) => (
                <div key={index} className="flex items-center gap-3">
                  <button className="cursor-grab text-muted-foreground" aria-label="Drag to reorder">
                    <GripVertical className="h-4 w-4" />
                  </button>
                  <Input
                    value={pt}
                    onChange={(e) => updatePointLive(index, e.target.value)}
                    className="h-8 flex-1"
                    placeholder={`Live point ${index + 1}`}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500"
                    onClick={() => removePointLive(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button size="sm" variant="outline" className="h-8 text-xs border-gold/40 text-gold hover:bg-gold/10" onClick={addPointLive}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add live point
              </Button>
            </div>
          </div>

          <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            The emoji cards (Suya night, Owambe fit, Market run, Home fix) are hardcoded visual accents and are not changed via the CMS.
          </p>
        </div>
      </SectionCard>
    </div>
  );
}

