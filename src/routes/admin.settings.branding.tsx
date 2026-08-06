import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { SettingsForm } from "@/components/admin/settings-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ImageOff, Loader2, Trash2, Upload } from "lucide-react";
import { mediaApi } from "@/lib/api/media";
import { useSettingsGroup, settingsError } from "@/lib/admin/use-settings-group";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings/branding")({
  component: BrandingSettingsPage,
});

/**
 * The `branding` group. The old version posted `displayFont`, `bodyFont`,
 * `secondaryColor`, `backgroundColor` and `surfaceColor` — none of which the
 * backend accepts — and the two upload tiles had a "Browse" button wired to
 * nothing. Uploads now go through `POST /media` and the returned URL is what
 * gets saved, so the landing page reads a real file.
 */
const DEFAULTS = {
  logoUrl: "",
  logoDarkUrl: "",
  faviconUrl: "",
  ogImageUrl: "",
  primaryColor: "#1f5c3a",
  accentColor: "#c9a24c",
};

const IMAGES = [
  {
    key: "logoUrl" as const,
    label: "Primary logo",
    hint: "Shown in the site header and in email. SVG or PNG with transparency.",
  },
  {
    key: "logoDarkUrl" as const,
    label: "Dark-mode logo",
    hint: "Optional. Falls back to the primary logo when empty.",
  },
  {
    key: "faviconUrl" as const,
    label: "Favicon",
    hint: "32×32 or larger. PNG or ICO.",
  },
  {
    key: "ogImageUrl" as const,
    label: "Social share image",
    hint: "1200×630. Used when a link is shared on WhatsApp, X or LinkedIn.",
  },
];

const COLORS = [
  { key: "primaryColor" as const, label: "Primary", hint: "Buttons, links and active states." },
  { key: "accentColor" as const, label: "Accent", hint: "Highlights and the gold detailing." },
];

function BrandingSettingsPage() {
  const state = useSettingsGroup("branding", DEFAULTS);

  return (
    <SettingsForm
      title="Branding"
      description="Logo, favicon and brand colours. These are read by the landing page."
      state={state}
      successMessage="Branding saved."
    >
      {(form) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {IMAGES.map((img) => (
              <ImageField
                key={img.key}
                label={img.label}
                hint={img.hint}
                value={form[img.key]}
                onChange={(url) => state.set(img.key, url)}
              />
            ))}
          </div>

          <div className="mt-6">
            <div className="text-sm font-semibold">Brand colours</div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Hex values. Applied to the public site theme.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {COLORS.map((c) => (
                <div
                  key={c.key}
                  className="flex items-center gap-3 rounded-xl border border-border/60 p-3"
                >
                  <input
                    type="color"
                    value={normalizeHex(form[c.key])}
                    onChange={(e) => state.set(c.key, e.target.value)}
                    className="h-12 w-12 shrink-0 cursor-pointer rounded-lg border border-border bg-transparent p-0"
                    aria-label={`${c.label} colour`}
                  />
                  <div className="min-w-0 flex-1">
                    <Label className="text-xs">{c.label}</Label>
                    <Input
                      value={form[c.key]}
                      onChange={(e) => state.set(c.key, e.target.value)}
                      className="mt-1 h-8 font-mono text-xs"
                      placeholder="#1f5c3a"
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">{c.hint}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </SettingsForm>
  );
}

/**
 * Upload-or-paste field. The upload writes to the media library and stores the
 * resulting public URL, so a branding row never points at a blob that only
 * exists in this browser tab.
 */
function ImageField({
  label, hint, value, onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [broken, setBroken] = useState(false);

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("That file is not an image.");
      return;
    }
    setUploading(true);
    setBroken(false);
    try {
      const res = await mediaApi.upload(file, "Branding", label);
      onChange(res.data.url);
      toast.success(`${label} uploaded. Save to apply it.`);
    } catch (err) {
      toast.error(settingsError(err, "The upload failed."));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="rounded-xl border border-border/60 p-4">
      <div className="text-sm font-medium">{label}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>

      <div className="mt-3 grid h-28 place-items-center overflow-hidden rounded-lg border border-dashed border-border/70 bg-muted/20">
        {uploading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : value && !broken ? (
          <img
            src={value}
            alt={label}
            className="max-h-24 max-w-full object-contain"
            onError={() => setBroken(true)}
          />
        ) : value && broken ? (
          <div className="flex flex-col items-center gap-1 text-xs text-red-600">
            <ImageOff className="h-5 w-5" />
            This URL does not load
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">Nothing set</div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />

      <div className="mt-3 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex-1"
        >
          {uploading ? (
            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
          ) : (
            <Upload className="mr-2 h-3 w-3" />
          )}
          {uploading ? "Uploading…" : "Upload"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onChange("");
            setBroken(false);
          }}
          disabled={uploading || !value}
          title={!value ? "Nothing to clear" : undefined}
          className="text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setBroken(false);
        }}
        placeholder="or paste a URL"
        className="mt-2 h-8 font-mono text-xs"
      />
    </div>
  );
}

/** `<input type="color">` only accepts `#rrggbb`; anything else resets it to black. */
function normalizeHex(value: string): string {
  const v = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  }
  return "#000000";
}
