import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SectionCard } from "@/components/admin/ui-bits";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Loader2, Save, Upload } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useCmsSection } from "@/lib/hooks/useCmsSection";
import { MediaPickerModal } from "@/components/admin/media-picker-modal";

type SeoData = {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterHandle?: string;
};

const defaultSeoData: SeoData = {
  title: "",
  description: "",
  canonicalUrl: "",
  keywords: "",
  ogTitle: "",
  ogDescription: "",
  ogImage: "",
  twitterHandle: "",
};

export const Route = createFileRoute("/admin/cms/seo")({
  component: SeoEditor,
});

function SeoEditor() {
  const { data, setData, enabled, setEnabled, loading, saving, save } = useCmsSection<SeoData>(
    "seo",
    defaultSeoData,
  );
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SectionCard
        title="Search engine optimization"
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
              <div className="text-sm font-medium">SEO section enabled</div>
              <div className="text-xs text-muted-foreground">Toggle whether SEO defaults are managed here</div>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div>
            <Label>Title (max 60)</Label>
            <Input
              value={data.title ?? ""}
              onChange={(e) => setData({ ...data, title: e.target.value })}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Meta description (max 160)</Label>
            <Textarea
              rows={3}
              value={data.description ?? ""}
              onChange={(e) => setData({ ...data, description: e.target.value })}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Canonical URL</Label>
            <Input
              value={data.canonicalUrl ?? ""}
              onChange={(e) => setData({ ...data, canonicalUrl: e.target.value })}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Keywords</Label>
            <Input
              value={data.keywords ?? ""}
              onChange={(e) => setData({ ...data, keywords: e.target.value })}
              className="mt-1.5"
            />
          </div>
        </div>
      </SectionCard>
      <SectionCard title="Open Graph & Twitter">
        <div className="space-y-4">
          <div>
            <Label>OG Title</Label>
            <Input
              value={data.ogTitle ?? ""}
              onChange={(e) => setData({ ...data, ogTitle: e.target.value })}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>OG Description</Label>
            <Textarea
              rows={3}
              value={data.ogDescription ?? ""}
              onChange={(e) => setData({ ...data, ogDescription: e.target.value })}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>OG Image</Label>
            <div className="mt-1.5 space-y-2">
              <div className="flex gap-2">
                <Input
                  value={data.ogImage ?? ""}
                  onChange={(e) => setData({ ...data, ogImage: e.target.value })}
                  placeholder="https://example.com/og-image.png"
                />
                <Button variant="outline" onClick={() => setPickerOpen(true)}>
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Media Library
                </Button>
              </div>

              {data.ogImage ? (
                <div className="relative aspect-[1200/630] max-h-40 overflow-hidden rounded-lg border border-border bg-muted/20 flex items-center justify-center">
                  <img
                    src={data.ogImage}
                    alt="OG Social Preview"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              ) : null}
            </div>
          </div>
          <div>
            <Label>Twitter handle</Label>
            <Input
              value={data.twitterHandle ?? ""}
              onChange={(e) => setData({ ...data, twitterHandle: e.target.value })}
              className="mt-1.5"
            />
          </div>
        </div>
      </SectionCard>

      <MediaPickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(url) => setData({ ...data, ogImage: url })}
        title="Select Social Preview Image (OG Image)"
      />
    </div>
  );
}
