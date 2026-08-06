import { createFileRoute } from "@tanstack/react-router";
import { SettingsForm } from "@/components/admin/settings-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle } from "lucide-react";
import { useSettingsGroup } from "@/lib/admin/use-settings-group";

export const Route = createFileRoute("/admin/settings/seo")({
  component: SeoSettingsPage,
});

/**
 * The `seo` group. The old version posted `titleSuffix`, `description`,
 * `sitemapUrl` and `robotsTxt`, none of which the backend accepts — and no
 * endpoint serves a robots.txt written from an admin textarea, so editing one
 * here was theatre.
 */
const DEFAULTS = {
  metaTitle: "",
  metaDescription: "",
  ogImage: "",
  keywords: "",
  canonicalUrl: "",
  twitterHandle: "",
  noindex: false,
};

/** Google truncates around these lengths. */
const TITLE_IDEAL = 60;
const DESCRIPTION_IDEAL = 155;

function SeoSettingsPage() {
  const state = useSettingsGroup("seo", DEFAULTS);

  return (
    <SettingsForm
      title="SEO defaults"
      description="Applied to the landing page and used as the fallback for any page without its own tags."
      state={state}
      successMessage="SEO defaults saved."
    >
      {(form) => (
        <div className="grid gap-4">
          {form.noindex && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                The site is set to noindex. Search engines will drop it from results until this is
                turned off.
              </span>
            </div>
          )}

          <div>
            <Label htmlFor="metaTitle">Meta title</Label>
            <Input
              id="metaTitle"
              value={form.metaTitle}
              onChange={(e) => state.set("metaTitle", e.target.value)}
              className="mt-1.5"
              maxLength={255}
              placeholder="MyTijaara — one app for food, shopping and deliveries"
            />
            <Counter length={form.metaTitle.length} ideal={TITLE_IDEAL} />
          </div>

          <div>
            <Label htmlFor="metaDescription">Meta description</Label>
            <Textarea
              id="metaDescription"
              rows={3}
              value={form.metaDescription}
              onChange={(e) => state.set("metaDescription", e.target.value)}
              className="mt-1.5"
              maxLength={500}
            />
            <Counter length={form.metaDescription.length} ideal={DESCRIPTION_IDEAL} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="canonicalUrl">Canonical URL</Label>
              <Input
                id="canonicalUrl"
                value={form.canonicalUrl}
                onChange={(e) => state.set("canonicalUrl", e.target.value)}
                className="mt-1.5"
                placeholder="https://mytijaara.com"
              />
            </div>
            <div>
              <Label htmlFor="twitterHandle">Twitter / X handle</Label>
              <Input
                id="twitterHandle"
                value={form.twitterHandle}
                onChange={(e) => state.set("twitterHandle", e.target.value)}
                className="mt-1.5"
                placeholder="@mytijaara"
                maxLength={64}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="ogImage">Open Graph image URL</Label>
            <Input
              id="ogImage"
              value={form.ogImage}
              onChange={(e) => state.set("ogImage", e.target.value)}
              className="mt-1.5"
              placeholder="https://…/og.png"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              1200×630. Upload one under Branding to get a URL, or paste an existing one.
            </p>
          </div>

          <div>
            <Label htmlFor="keywords">Keywords</Label>
            <Input
              id="keywords"
              value={form.keywords}
              onChange={(e) => state.set("keywords", e.target.value)}
              className="mt-1.5"
              maxLength={500}
              placeholder="food delivery Nigeria, errands, artisans"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Comma-separated. Ignored by Google, still read by some smaller crawlers.
            </p>
          </div>

          <div className="flex items-start justify-between gap-4 rounded-xl border border-border/60 p-4">
            <div>
              <div className="text-sm font-medium">Discourage search engines</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                Emits <code className="font-mono">noindex, nofollow</code>. Use before launch, not
                after.
              </div>
            </div>
            <Switch checked={form.noindex} onCheckedChange={(v) => state.set("noindex", v)} />
          </div>
        </div>
      )}
    </SettingsForm>
  );
}

function Counter({ length, ideal }: { length: number; ideal: number }) {
  const over = length > ideal;
  return (
    <p className={`mt-1.5 text-xs ${over ? "text-amber-600" : "text-muted-foreground"}`}>
      {length}/{ideal} characters{over ? " — likely to be truncated in search results" : ""}
    </p>
  );
}
