import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { SectionCard } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, Upload } from "lucide-react";
import { mediaApi } from "@/lib/api";
import { toast } from "sonner";
import { useCmsSection } from "@/lib/hooks/useCmsSection";

export const Route = createFileRoute("/admin/cms/")({
  component: HeroEditor,
});

type HeroData = {
  badge?: string;
  title?: string;
  subtitle?: string;
  primaryCta?: { label?: string; href?: string };
  secondaryCta?: { label?: string; href?: string };
  imageUrl?: string;
  imageAlt?: string;
};

const defaultHeroData: HeroData = {
  badge: "",
  title: "",
  subtitle: "",
  primaryCta: { label: "", href: "" },
  secondaryCta: { label: "", href: "" },
  imageUrl: undefined,
  imageAlt: undefined,
};

function HeroEditor() {
  const {
    data,
    setData,
    enabled,
    setEnabled,
    loading,
    saving,
    save,
  } = useCmsSection<HeroData>("hero", defaultHeroData);
  const uploadInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const primaryCta = useMemo(
    () => data.primaryCta ?? { label: "", href: "" },
    [data.primaryCta],
  );
  const secondaryCta = useMemo(
    () => data.secondaryCta ?? { label: "", href: "" },
    [data.secondaryCta],
  );

  const uploadHeroImage = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const response = await mediaApi.upload(file, "Hero");
      setData({
        ...data,
        imageUrl: response.data.url,
        imageAlt: response.data.name,
      });
      toast.success("Hero image uploaded. Save section to persist the image selection.");
    } catch {
      toast.error("Unable to upload hero image.");
    } finally {
      setUploading(false);
    }
  };

  const imageUrl = data.imageUrl?.trim();
  const imageAlt = data.imageAlt ?? "Hero image";

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <SectionCard
        title="Hero content"
        description="The main above-the-fold section"
        className="lg:col-span-2"
        actions={
          <Button size="sm" onClick={save} disabled={saving || loading}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save changes
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
            <div>
              <div className="text-sm font-medium">Hero section enabled</div>
              <div className="text-xs text-muted-foreground">Toggle whether the hero section is shown on the landing page</div>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div>
            <Label>Eyebrow tag</Label>
            <Input
              value={data.badge ?? ""}
              onChange={(e) => setData({ ...data, badge: e.target.value })}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Headline</Label>
            <Input
              value={data.title ?? ""}
              onChange={(e) => setData({ ...data, title: e.target.value })}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Subheadline</Label>
            <Textarea
              rows={3}
              value={data.subtitle ?? ""}
              onChange={(e) => setData({ ...data, subtitle: e.target.value })}
              className="mt-1.5"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Primary CTA label</Label>
              <Input
                value={primaryCta.label ?? ""}
                onChange={(e) =>
                  setData({
                    ...data,
                    primaryCta: { ...primaryCta, label: e.target.value },
                  })
                }
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Primary CTA URL</Label>
              <Input
                value={primaryCta.href ?? ""}
                onChange={(e) =>
                  setData({
                    ...data,
                    primaryCta: { ...primaryCta, href: e.target.value },
                  })
                }
                className="mt-1.5"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Secondary CTA label</Label>
              <Input
                value={secondaryCta.label ?? ""}
                onChange={(e) =>
                  setData({
                    ...data,
                    secondaryCta: { ...secondaryCta, label: e.target.value },
                  })
                }
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Secondary CTA URL</Label>
              <Input
                value={secondaryCta.href ?? ""}
                onChange={(e) =>
                  setData({
                    ...data,
                    secondaryCta: { ...secondaryCta, href: e.target.value },
                  })
                }
                className="mt-1.5"
              />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Hero image">
        <input
          ref={uploadInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => void uploadHeroImage(event.target.files?.[0])}
        />
        <div className="rounded-xl border-2 border-dashed border-border p-6 text-center">
          {imageUrl ? (
            <img src={imageUrl} alt={imageAlt} className="mx-auto max-h-[260px] rounded-lg object-contain" />
          ) : (
            <>
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-muted"><Upload className="h-5 w-5" /></div>
              <div className="mt-2 text-sm font-medium">Drop image here</div>
              <div className="text-xs text-muted-foreground">PNG, JPG up to 5MB</div>
            </>
          )}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => uploadInput.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {imageUrl ? "Replace image" : "Browse files"}
            </Button>
            {imageUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setData({ ...data, imageUrl: undefined, imageAlt: undefined })}
              >
                Remove image
              </Button>
            )}
          </div>
        </div>
        <div className="mt-4 space-y-2 text-xs">
          <div className="flex justify-between"><span className="text-muted-foreground">Current</span><span className="font-mono">{imageUrl ? imageAlt : "none"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Size</span><span>Auto</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Dimensions</span><span>Auto</span></div>
        </div>
      </SectionCard>
    </div>
  );
}
