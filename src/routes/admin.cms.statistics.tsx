import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { SectionCard } from "@/components/admin/ui-bits";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, Trash2, Loader2, Save } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useCmsSection } from "@/lib/hooks/useCmsSection";

type StatItem = { label?: string; value?: string; enabled?: boolean };

type StatisticsData = { items?: StatItem[] };

const defaultStatisticsData: StatisticsData = { items: [] };

export const Route = createFileRoute("/admin/cms/statistics")({
  component: StatisticsEditor,
});

function StatisticsEditor() {
  const { data, setData, enabled, setEnabled, loading, saving, save } = useCmsSection<StatisticsData>(
    "statistics",
    defaultStatisticsData,
  );

  const items = useMemo(() => data.items ?? [], [data.items]);

  const updateItem = (index: number, patch: Partial<StatItem>) =>
    setData({
      ...data,
      items: items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    });

  const addItem = () => setData({ ...data, items: [...items, { label: "", value: "", enabled: true }] });

  const removeItem = (index: number) => setData({ ...data, items: items.filter((_, i) => i !== index) });

  return (
    <SectionCard
      title="Statistics section"
      description="The impact numbers shown on the landing page"
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
            <div className="text-sm font-medium">Statistics section enabled</div>
            <div className="text-xs text-muted-foreground">Toggle whether stats show on the landing page</div>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((item, index) => (
            <div key={index} className="rounded-xl border border-border/60 p-4">
              <div className="mb-3 flex items-center gap-2 text-primary">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Stat {index + 1}</span>
              </div>
              <Label className="text-xs">Value</Label>
              <Input
                value={item.value ?? ""}
                onChange={(e) => updateItem(index, { value: e.target.value })}
                className="mt-1"
              />
              <Label className="mt-3 text-xs">Label</Label>
              <Input
                value={item.label ?? ""}
                onChange={(e) => updateItem(index, { label: e.target.value })}
                className="mt-1"
              />
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Visible</span>
                <Switch
                  checked={Boolean(item.enabled ?? true)}
                  onCheckedChange={(value) => updateItem(index, { enabled: value })}
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="mt-3 h-8 w-8 text-red-500"
                onClick={() => removeItem(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <Button size="sm" onClick={addItem}>
          <Plus className="mr-2 h-4 w-4" /> Add stat
        </Button>
      </div>
    </SectionCard>
  );
}
