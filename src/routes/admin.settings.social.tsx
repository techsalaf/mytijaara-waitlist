import { createFileRoute } from "@tanstack/react-router";
import { SettingsForm } from "@/components/admin/settings-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ExternalLink, Facebook, Instagram, Linkedin, MessageCircle, Music2, Twitter, Youtube,
} from "lucide-react";
import { useSettingsGroup } from "@/lib/admin/use-settings-group";

export const Route = createFileRoute("/admin/settings/social")({
  component: SocialSettingsPage,
});

/**
 * The `social` group. The old version pre-filled live-looking URLs
 * (`https://instagram.com/mytijaara`) as local defaults, so an unsaved row
 * still rendered links in the footer that pointed at profiles nobody had
 * confirmed exist. Empty means empty here.
 *
 * `tiktok` and `whatsapp` are in the backend contract and were missing from the
 * form entirely, which made them unreachable from the admin.
 */
const DEFAULTS = {
  instagram: "",
  twitter: "",
  facebook: "",
  youtube: "",
  linkedin: "",
  tiktok: "",
  whatsapp: "",
};

const ROWS = [
  { key: "instagram" as const, icon: Instagram, label: "Instagram", placeholder: "https://instagram.com/…" },
  { key: "twitter" as const, icon: Twitter, label: "Twitter / X", placeholder: "https://x.com/…" },
  { key: "facebook" as const, icon: Facebook, label: "Facebook", placeholder: "https://facebook.com/…" },
  { key: "tiktok" as const, icon: Music2, label: "TikTok", placeholder: "https://tiktok.com/@…" },
  { key: "youtube" as const, icon: Youtube, label: "YouTube", placeholder: "https://youtube.com/@…" },
  { key: "linkedin" as const, icon: Linkedin, label: "LinkedIn", placeholder: "https://linkedin.com/company/…" },
  { key: "whatsapp" as const, icon: MessageCircle, label: "WhatsApp", placeholder: "https://wa.me/234…" },
];

function SocialSettingsPage() {
  const state = useSettingsGroup("social", DEFAULTS);

  return (
    <SettingsForm
      title="Social profiles"
      description="Only the profiles with a URL are rendered in the site footer."
      state={state}
      successMessage="Social profiles saved."
    >
      {(form) => (
        <div className="space-y-2">
          {ROWS.map((r) => {
            const Icon = r.icon;
            const value = form[r.key];
            const valid = value.trim() === "" || /^https?:\/\/\S+$/.test(value.trim());
            return (
              <div
                key={r.key}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 p-3"
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted">
                  <Icon className="h-4 w-4" />
                </div>
                <label htmlFor={r.key} className="w-28 shrink-0 text-sm font-medium">
                  {r.label}
                </label>
                <div className="min-w-[200px] flex-1">
                  <Input
                    id={r.key}
                    value={value}
                    onChange={(e) => state.set(r.key, e.target.value)}
                    placeholder={r.placeholder}
                    aria-invalid={!valid}
                    className={valid ? "" : "border-red-300 focus-visible:ring-red-200"}
                  />
                  {!valid && (
                    <p className="mt-1 text-xs text-red-600">
                      Must start with http:// or https://
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  asChild={valid && value.trim() !== ""}
                  disabled={!valid || value.trim() === ""}
                  title={value.trim() === "" ? "Nothing to open" : "Open in a new tab"}
                >
                  {valid && value.trim() !== "" ? (
                    <a href={value.trim()} target="_blank" rel="noreferrer noopener">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </SettingsForm>
  );
}
