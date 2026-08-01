import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SectionCard } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Activity, MousePointerClick, Loader2 } from "lucide-react";
import { settingsApi } from "@/lib/api";
import { toast } from "sonner";

const items = [
  { icon: BarChart3, name: "Google Analytics 4", field: "Measurement ID", key: "ga4MeasurementId", value: "G-XXXXXXXXXX", on: true },
  { icon: MousePointerClick, name: "Meta Pixel", field: "Pixel ID", key: "metaPixelId", value: "123456789012345", on: true },
  { icon: Activity, name: "Microsoft Clarity", field: "Project ID", key: "clarityProjectId", value: "abcd1234", on: false },
];

export const Route = createFileRoute("/admin/settings/integrations")({
  component: IntegrationsSettingsPage,
});

function IntegrationsSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string | boolean>>({ ga4MeasurementId: "G-XXXXXXXXXX", metaPixelId: "123456789012345", clarityProjectId: "abcd1234", ga4Enabled: true, metaPixelEnabled: true, clarityEnabled: false });

  useEffect(() => {
    let active = true;
    setLoading(true);
    void settingsApi.get("integrations").then((response) => {
      if (!active) return;
      const data = (response.data ?? {}) as Record<string, unknown>;
      setForm((prev) => ({ ...prev, ga4MeasurementId: String(data.ga4MeasurementId ?? prev.ga4MeasurementId), metaPixelId: String(data.metaPixelId ?? prev.metaPixelId), clarityProjectId: String(data.clarityProjectId ?? prev.clarityProjectId), ga4Enabled: Boolean(data.ga4Enabled ?? prev.ga4Enabled), metaPixelEnabled: Boolean(data.metaPixelEnabled ?? prev.metaPixelEnabled), clarityEnabled: Boolean(data.clarityEnabled ?? prev.clarityEnabled) }));
    }).catch(() => toast.error("Unable to load integrations.")).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await settingsApi.update("integrations", form);
      toast.success("Integrations saved.");
    } catch {
      toast.error("Failed to save integrations.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => void save()} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save changes</Button>
      </div>
      {loading ? <div className="text-sm text-muted-foreground">Loading integrations…</div> : items.map((it) => {
        const valueKey = `${it.key}Value`;
        const enabledKey = `${it.key}Enabled`;
        const value = String((form[it.key] ?? "") as string);
        const enabled = Boolean(form[enabledKey] ?? false);
        return (
          <SectionCard key={it.name} title={it.name} actions={<Switch checked={enabled} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, [enabledKey]: checked }))} />}>
            <div className="flex items-center gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-muted"><it.icon className="h-5 w-5" /></div>
              <div className="flex-1">
                <Label className="text-xs">{it.field}</Label>
                <Input value={value} onChange={(e) => setForm((prev) => ({ ...prev, [it.key]: e.target.value }))} className="mt-1" />
              </div>
              {enabled && <Badge className="bg-emerald-50 text-emerald-700">Active</Badge>}
            </div>
          </SectionCard>
        );
      })}
    </div>
  );
}
