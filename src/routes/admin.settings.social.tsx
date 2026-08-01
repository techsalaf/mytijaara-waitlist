import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SectionCard } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Facebook, Instagram, Twitter, Youtube, Linkedin, Loader2 } from "lucide-react";
import { settingsApi } from "@/lib/api";
import { toast } from "sonner";

const rows = [
  { icon: Instagram, label: "Instagram", key: "instagram" },
  { icon: Twitter, label: "Twitter / X", key: "twitter" },
  { icon: Facebook, label: "Facebook", key: "facebook" },
  { icon: Youtube, label: "YouTube", key: "youtube" },
  { icon: Linkedin, label: "LinkedIn", key: "linkedin" },
] as const;

export const Route = createFileRoute("/admin/settings/social")({
  component: SocialSettingsPage,
});

function SocialSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({ instagram: "https://instagram.com/mytijaara", twitter: "https://x.com/mytijaara", facebook: "https://facebook.com/mytijaara", youtube: "", linkedin: "https://linkedin.com/company/mytijaara" });

  useEffect(() => {
    let active = true;
    setLoading(true);
    void settingsApi.get("social").then((response) => {
      if (!active) return;
      const data = (response.data ?? {}) as Record<string, unknown>;
      setForm((prev) => ({ ...prev, instagram: String(data.instagram ?? prev.instagram), twitter: String(data.twitter ?? prev.twitter), facebook: String(data.facebook ?? prev.facebook), youtube: String(data.youtube ?? prev.youtube), linkedin: String(data.linkedin ?? prev.linkedin) }));
    }).catch(() => toast.error("Unable to load social settings.")).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await settingsApi.update("social", form);
      toast.success("Social profiles saved.");
    } catch {
      toast.error("Failed to save social profiles.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard title="Social profiles" actions={<Button size="sm" onClick={() => void save()} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save changes</Button>}>
      {loading ? <div className="text-sm text-muted-foreground">Loading settings…</div> : (
        <div className="space-y-2">
          {rows.map((r) => {
            const Icon = r.icon;
            return (
              <div key={r.label} className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-muted"><Icon className="h-4 w-4" /></div>
                <div className="w-28 text-sm font-medium">{r.label}</div>
                <Input value={form[r.key] ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, [r.key]: e.target.value }))} placeholder="https://…" className="flex-1" />
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
