import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { SectionCard } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, Upload, Plus, Trash2 } from "lucide-react";
import { mediaApi } from "@/lib/api";
import { toast } from "sonner";
import { useCmsSection } from "@/lib/hooks/useCmsSection";

export const Route = createFileRoute("/admin/cms/")({
  component: HeroEditor,
});

type HeroService = { icon: string; label: string };

type HeroData = {
  eyebrow?: string;
  heading?: string;
  headingHighlight?: string;
  subtitle?: string;
  imageUrl?: string;
  secondaryCtaLabel?: string;
  services?: HeroService[];
};

const ICON_OPTIONS = [
  "UtensilsCrossed",
  "ShoppingBasket",
  "Pill",
  "Package",
  "Car",
  "Wrench",
];

const defaultHeroData: HeroData = {
  eyebrow: "",
  heading: "",
  headingHighlight: "",
  subtitle: "",
  imageUrl: "",
  secondaryCtaLabel: "",
  services: [],
};

function HeroEditor() {
  const { data, setData, enabled, setEnabled, loading, saving, save } =
    useCmsSection<HeroData>("hero", defaultHeroData);
  const uploadInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const services: HeroService[] = data.services ?? [];

  const uploadHeroImage = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const response = await mediaApi.upload(file, "Hero");
      setData({ ...data, imageUrl: response.data.url });
      toast.success("Hero image uploaded. Save section to persist.");
    } catch {
      toast.error("Unable to upload hero image.");
    } finally {
      setUploading(false);
    }
  };

  const addService = () =>
    setData({ ...data, services: [...services, { icon: "Package", label: "" }] });

  const updateService = (i: number, patch: Partial<HeroService>) =>
    setData({
      ...data,
      services: services.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    });

  const removeService = (i: number) =>
    setData({ ...data, services: services.filter((_, idx) => idx !== i) });

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Left: text content */}
      <SectionCard
        title="Hero content"
        description="The main above-the-fold section"
        className="lg:col-span-2"
        actions={
          <Button size="sm" onClick={save} disabled={saving || loading}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save changes
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
            <div>
              <div className="text-sm font-medium">Hero section enabled</div>
              <div className="text-xs text-muted-foreground">
                Toggle visibility of the hero section
              </div>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div>
            <Label>Eyebrow tag</Label>
            <Input
              value={data.eyebrow ?? ""}
              placeholder="Built for Nigerians — Launching soon"
              onChange={(e) => setData({ ...data, eyebrow: e.target.value })}
              className="mt-1.5"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Heading (first line)</Label>
              <Input
                value={data.heading ?? ""}
                placeholder="Everything you need,"
                onChange={(e) => setData({ ...data, heading: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Heading highlight (gradient line)</Label>
              <Input
                value={data.headingHighlight ?? ""}
                placeholder="all in one place."
                onChange={(e) => setData({ ...data, headingHighlight: e.target.value })}
                className="mt-1.5"
              />
            </div>
          </div>

          <div>
            <Label>Subtitle / description</Label>
            <Textarea
              rows={3}
              value={data.subtitle ?? ""}
              onChange={(e) => setData({ ...data, subtitle: e.target.value })}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label>Secondary CTA label</Label>
            <Input
              value={data.secondaryCtaLabel ?? ""}
              placeholder="See How It Works"
              onChange={(e) => setData({ ...data, secondaryCtaLabel: e.target.value })}
              className="mt-1.5"
            />
          </div>

          {/* Service chips */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label>Service chips</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addService}>
                <Plus className="mr-1 h-3 w-3" /> Add
              </Button>
            </div>
            {services.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No overrides — landing page uses defaults (Food, Groceries, Pharmacy, Parcels, Cars, Artisans).
              </p>
            )}
            <div className="space-y-2">
              {services.map((svc, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    value={svc.icon}
                    onChange={(e) => updateService(i, { icon: e.target.value })}
                    className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                  >
                    {ICON_OPTIONS.map((ic) => (
                      <option key={ic} value={ic}>{ic}</option>
                    ))}
                  </select>
                  <Input
                    value={svc.label}
                    placeholder="Label"
                    onChange={(e) => updateService(i, { label: e.target.value })}
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => removeService(i)}
                    className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Remove service"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Right: image upload */}
      <SectionCard title="Hero image">
        <input
          ref={uploadInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => void uploadHeroImage(event.target.files?.[0])}
        />
        <div className="rounded-xl border-2 border-dashed border-border p-6 text-center">
          {data.imageUrl ? (
            <img
              src={data.imageUrl}
              alt="Hero"
              className="mx-auto max-h-[260px] rounded-lg object-contain"
            />
          ) : (
            <>
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-muted">
                <Upload className="h-5 w-5" />
              </div>
              <div className="mt-2 text-sm font-medium">No custom image set</div>
              <div className="text-xs text-muted-foreground">
                Upload to override the default illustration
              </div>
            </>
          )}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => uploadInput.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {data.imageUrl ? "Replace" : "Upload image"}
            </Button>
            {data.imageUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setData({ ...data, imageUrl: "" })}
              >
                Remove
              </Button>
            )}
          </div>
        </div>
        <div className="mt-4">
          <Label>Or paste image URL</Label>
          <Input
            value={data.imageUrl ?? ""}
            placeholder="https://cdn.example.com/hero.png"
            onChange={(e) => setData({ ...data, imageUrl: e.target.value })}
            className="mt-1.5"
          />
        </div>
      </SectionCard>
    </div>
  );
}
