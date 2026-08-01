import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SectionCard } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { settingsApi } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings/seo")({
  component: SeoSettingsPage,
});

function SeoSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ titleSuffix: " — MyTijaara", description: "Built for Nigerians. One app for food, groceries, artisans, parcels and more.", sitemapUrl: "https://mytijaara.com/sitemap.xml", robotsTxt: "User-agent: *\nAllow: /\nSitemap: https://mytijaara.com/sitemap.xml" });

  useEffect(() => {
    let active = true;
    setLoading(true);
    void settingsApi.get("seo").then((response) => {
      if (!active) return;
      const data = (response.data ?? {}) as Record<string, unknown>;
      setForm((prev) => ({ ...prev, titleSuffix: String(data.titleSuffix ?? prev.titleSuffix), description: String(data.description ?? prev.description), sitemapUrl: String(data.sitemapUrl ?? prev.sitemapUrl), robotsTxt: String(data.robotsTxt ?? prev.robotsTxt) }));
    }).catch(() => toast.error("Unable to load SEO settings.")).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await settingsApi.update("seo", form);
      toast.success("SEO settings saved.");
    } catch {
      toast.error("Failed to save SEO settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard title="SEO defaults" description="Applied when a page has no specific override" actions={<Button size="sm" onClick={() => void save()} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save changes</Button>}>
      {loading ? <div className="text-sm text-muted-foreground">Loading settings…</div> : (
        <div className="grid gap-4">
          <div><Label>Default title suffix</Label><Input value={form.titleSuffix} onChange={(e) => setForm((prev) => ({ ...prev, titleSuffix: e.target.value }))} className="mt-1.5" /></div>
          <div><Label>Default description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} className="mt-1.5" /></div>
          <div><Label>Sitemap URL</Label><Input value={form.sitemapUrl} onChange={(e) => setForm((prev) => ({ ...prev, sitemapUrl: e.target.value }))} className="mt-1.5" /></div>
          <div><Label>robots.txt</Label><Textarea rows={4} className="mt-1.5 font-mono text-xs" value={form.robotsTxt} onChange={(e) => setForm((prev) => ({ ...prev, robotsTxt: e.target.value }))} /></div>
        </div>
      )}
    </SectionCard>
  );
}
