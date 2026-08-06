import { createFileRoute } from "@tanstack/react-router";
import { SettingsForm } from "@/components/admin/settings-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Activity, BarChart3, KeyRound, MousePointerClick } from "lucide-react";
import { useSettingsGroup } from "@/lib/admin/use-settings-group";

export const Route = createFileRoute("/admin/settings/integrations")({
  component: IntegrationsSettingsPage,
});

/**
 * The `integrations` group. The old version posted `ga4MeasurementId`,
 * `clarityProjectId` and three `*Enabled` booleans that the backend rejects,
 * and pre-filled placeholder IDs like `G-XXXXXXXXXX` that looked configured.
 *
 * There is no separate on/off switch: a field with an ID in it is active, an
 * empty field is not. One source of truth beats a toggle that can disagree with
 * the value next to it.
 */
const DEFAULTS = {
  resendApiKey: "",
  googleAnalyticsId: "",
  metaPixelId: "",
  slackWebhookUrl: "",
};

const FIELDS = [
  {
    key: "googleAnalyticsId" as const,
    icon: BarChart3,
    name: "Google Analytics 4",
    label: "Measurement ID",
    placeholder: "G-XXXXXXXXXX",
    hint: "Loads gtag.js on the landing page. Leave empty to send no analytics.",
    secret: false,
  },
  {
    key: "metaPixelId" as const,
    icon: MousePointerClick,
    name: "Meta Pixel",
    label: "Pixel ID",
    placeholder: "123456789012345",
    hint: "Tracks signup conversions for Facebook and Instagram ads.",
    secret: false,
  },
  {
    key: "slackWebhookUrl" as const,
    icon: Activity,
    name: "Slack",
    label: "Incoming webhook URL",
    placeholder: "https://hooks.slack.com/services/…",
    hint: "Posts a message when someone joins the waitlist.",
    secret: false,
  },
  {
    key: "resendApiKey" as const,
    icon: KeyRound,
    name: "Resend",
    label: "API key",
    placeholder: "re_…",
    hint: "Alternative to SMTP for transactional email. Stored encrypted and shown masked.",
    secret: true,
  },
];

function IntegrationsSettingsPage() {
  const state = useSettingsGroup("integrations", DEFAULTS);

  return (
    <SettingsForm
      title="Analytics & Tracking"
      description="Third-party IDs and keys. A field with a value is live; an empty field loads nothing."
      state={state}
      successMessage="Integrations saved."
    >
      {(form) => (
        <div className="space-y-3">
          {FIELDS.map((f) => {
            const value = form[f.key];
            const masked = f.secret && value.startsWith("••••");
            const active = value.trim().length > 0;
            return (
              <div key={f.key} className="rounded-xl border border-border/60 p-4">
                <div className="flex items-start gap-4">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-muted">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{f.name}</span>
                      {active ? (
                        <Badge className="bg-emerald-50 text-[10px] text-emerald-700">Active</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">
                          Not configured
                        </Badge>
                      )}
                    </div>
                    <Label htmlFor={f.key} className="mt-2 block text-xs">
                      {f.label}
                    </Label>
                    <Input
                      id={f.key}
                      value={value}
                      onChange={(e) => state.set(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      autoComplete="off"
                      className="mt-1"
                    />
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {masked
                        ? "A key is stored. Leave this as-is to keep it, or type a new one to replace it."
                        : f.hint}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SettingsForm>
  );
}
