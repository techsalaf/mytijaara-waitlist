import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SectionCard } from "@/components/admin/ui-bits";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { settingsApi } from "@/lib/api";
import { toast } from "sonner";

const swatches = [
  { name: "Primary", key: "primaryColor", value: "#0D7A46" },
  { name: "Secondary", key: "secondaryColor", value: "#166534" },
  { name: "Accent", key: "accentColor", value: "#D4A017" },
  { name: "Background", key: "backgroundColor", value: "#F8FAF8" },
  { name: "Surface", key: "surfaceColor", value: "#FFFFFF" },
];

export const Route = createFileRoute("/admin/settings/branding")({
  component: BrandingSettingsPage,
});

function BrandingSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ displayFont: "Plus Jakarta Sans", bodyFont: "Inter", primaryColor: "#0D7A46", secondaryColor: "#166534", accentColor: "#D4A017", backgroundColor: "#F8FAF8", surfaceColor: "#FFFFFF" });

  useEffect(() => {
    let active = true;
    setLoading(true);
    void settingsApi.get("branding").then((response) => {
      if (!active) return;
      const data = (response.data ?? {}) as Record<string, unknown>;
      setForm((prev) => ({ ...prev, displayFont: String(data.displayFont ?? prev.displayFont), bodyFont: String(data.bodyFont ?? prev.bodyFont), primaryColor: String(data.primaryColor ?? prev.primaryColor), secondaryColor: String(data.secondaryColor ?? prev.secondaryColor), accentColor: String(data.accentColor ?? prev.accentColor), backgroundColor: String(data.backgroundColor ?? prev.backgroundColor), surfaceColor: String(data.surfaceColor ?? prev.surfaceColor) }));
    }).catch(() => toast.error("Unable to load branding settings.")).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await settingsApi.update("branding", form);
      toast.success("Branding settings saved.");
    } catch {
      toast.error("Failed to save branding settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <SectionCard title="Logo & favicon" actions={<Button size="sm" onClick={() => void save()} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save changes</Button>}>
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
        {loading ? <div className="text-sm text-muted-foreground">Loading branding…</div> : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {swatches.map((s) => (
              <div key={s.name} className="flex items-center gap-3 rounded-xl border border-border/60 p-3">
                <div className="h-12 w-12 rounded-lg border" style={{ background: form[s.key as keyof typeof form] as string }} />
                <div className="flex-1">
                  <Label className="text-xs">{s.name}</Label>
                  <Input value={String(form[s.key as keyof typeof form])} onChange={(e) => setForm((prev) => ({ ...prev, [s.key]: e.target.value }))} className="mt-1 h-8 font-mono text-xs" />
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
      <SectionCard title="Typography">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label>Display font</Label><Input value={form.displayFont} onChange={(e) => setForm((prev) => ({ ...prev, displayFont: e.target.value }))} className="mt-1.5" /></div>
          <div><Label>Body font</Label><Input value={form.bodyFont} onChange={(e) => setForm((prev) => ({ ...prev, bodyFont: e.target.value }))} className="mt-1.5" /></div>
        </div>
      </SectionCard>
    </div>
  );
}
