import { createFileRoute, Link } from "@tanstack/react-router";
import { SectionCard } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ExternalLink, Loader2, Save } from "lucide-react";
import { useCmsSection } from "@/lib/hooks/useCmsSection";

/**
 * The `social` CMS section carries no URLs.
 *
 * It used to offer five URL inputs (Instagram, X, Facebook, YouTube, LinkedIn)
 * that nothing read. `SocialFloat` and the footer both build their link list
 * from `branding.social` — Settings → Social — which covers seven platforms
 * including TikTok and WhatsApp. Two screens claiming the same field, one of
 * them silently losing, is the bug; pointing at the winner is the fix.
 *
 * What the section still owns is the on/off switch for the floating widget,
 * which `SocialFloat` reads through `useCmsData("social", {})`.
 */
export const Route = createFileRoute("/admin/cms/social")({
  component: SocialEditor,
});

function SocialEditor() {
  const { enabled, setEnabled, loading, saving, save } = useCmsSection<Record<string, never>>("social", {});

  return (
    <SectionCard
      title="Social links"
      description="Visibility of the floating social widget. The URLs live in Settings → Social."
      actions={
        <Button size="sm" onClick={save} disabled={loading || saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save changes
        </Button>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
          <div>
            <div className="text-sm font-medium">Show the floating social widget</div>
            <div className="text-xs text-muted-foreground">
              Bottom-left of every public page. Platforms with an empty URL are hidden automatically.
            </div>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="rounded-lg border border-dashed border-border/60 p-3">
          <div className="text-sm font-medium">Where the URLs come from</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Instagram, X, Facebook, LinkedIn, TikTok, YouTube and WhatsApp are edited once in Settings → Social
            and used by both this widget and the footer.
          </p>
          <Button asChild size="sm" variant="outline" className="mt-3">
            <Link to="/admin/settings">
              Open Settings → Social
              <ExternalLink className="ml-2 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}
