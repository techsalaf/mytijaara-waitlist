import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SectionCard } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { settingsApi } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings/")({
  component: GeneralSettingsPage,
});

function GeneralSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    workspaceName: "MyTijaara",
    siteUrl: "https://mytijaara.com",
    timezone: "wat",
    language: "en",
    enablePublicWaitlist: true,
    requireEmailVerification: true,
    maintenanceMode: false,
  });

  useEffect(() => {
    let active = true;
    setLoading(true);
    void settingsApi.get("company").then((response) => {
      if (!active) return;
      const data = (response.data ?? {}) as Record<string, unknown>;
      setForm((prev) => ({
        ...prev,
        workspaceName: String(data.workspaceName ?? prev.workspaceName),
        siteUrl: String(data.siteUrl ?? prev.siteUrl),
        timezone: String(data.timezone ?? prev.timezone),
        language: String(data.language ?? prev.language),
        enablePublicWaitlist: Boolean(data.enablePublicWaitlist ?? prev.enablePublicWaitlist),
        requireEmailVerification: Boolean(data.requireEmailVerification ?? prev.requireEmailVerification),
        maintenanceMode: Boolean(data.maintenanceMode ?? prev.maintenanceMode),
      }));
    }).catch(() => {
      toast.error("Unable to load general settings.");
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await settingsApi.update("company", form);
      toast.success("General settings saved.");
    } catch {
      toast.error("Failed to save general settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard title="General" actions={
      <Button size="sm" onClick={() => void save()} disabled={saving}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Save changes
      </Button>
    }>
      {loading ? <div className="text-sm text-muted-foreground">Loading settings…</div> : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label>Workspace name</Label><Input value={form.workspaceName} onChange={(e) => setForm((prev) => ({ ...prev, workspaceName: e.target.value }))} className="mt-1.5" /></div>
            <div><Label>Site URL</Label><Input value={form.siteUrl} onChange={(e) => setForm((prev) => ({ ...prev, siteUrl: e.target.value }))} className="mt-1.5" /></div>
            <div>
              <Label>Timezone</Label>
              <Select value={form.timezone} onValueChange={(value) => setForm((prev) => ({ ...prev, timezone: value }))}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="wat">West Africa Time (WAT)</SelectItem>
                  <SelectItem value="utc">UTC</SelectItem>
                  <SelectItem value="gmt">GMT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Default language</Label>
              <Select value={form.language} onValueChange={(value) => setForm((prev) => ({ ...prev, language: value }))}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ha">Hausa</SelectItem>
                  <SelectItem value="yo">Yoruba</SelectItem>
                  <SelectItem value="ig">Igbo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {[
              { label: "Enable public waitlist", desc: "Users can join from the landing page", key: "enablePublicWaitlist" as const },
              { label: "Require email verification", desc: "Users must verify before appearing in exports", key: "requireEmailVerification" as const },
              { label: "Maintenance mode", desc: "Show a maintenance page to visitors", key: "maintenanceMode" as const },
            ].map((p) => (
              <div key={p.key} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                <div><div className="text-sm font-medium">{p.label}</div><div className="text-xs text-muted-foreground">{p.desc}</div></div>
                <Switch checked={Boolean(form[p.key])} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, [p.key]: checked }))} />
              </div>
            ))}
          </div>
        </>
      )}
    </SectionCard>
  );
}
