import { createFileRoute } from "@tanstack/react-router";
import { SettingsForm } from "@/components/admin/settings-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSettingsGroup } from "@/lib/admin/use-settings-group";

export const Route = createFileRoute("/admin/settings/")({
  component: GeneralSettingsPage,
});

/**
 * The `company` group. Field names here have to match
 * `SettingsController::rules('company')` exactly: anything else is dropped by
 * the validated merge, which is how this page used to report a save that never
 * happened (it was posting `workspaceName`, `siteUrl`, `language` and
 * `enablePublicWaitlist`, none of which the backend accepts).
 */
const DEFAULTS = {
  siteName: "",
  tagline: "",
  contactEmail: "",
  supportEmail: "",
  phone: "",
  launchCity: "",
  address: "",
  timezone: "Africa/Lagos",
};

/** IANA names, because the backend stores the string verbatim. */
const TIMEZONES = [
  "Africa/Lagos",
  "Africa/Accra",
  "Africa/Nairobi",
  "Africa/Johannesburg",
  "Europe/London",
  "UTC",
];

function GeneralSettingsPage() {
  const state = useSettingsGroup("company", DEFAULTS);

  return (
    <SettingsForm
      title="General"
      description="Identity and contact details for the workspace. Used on the landing page and in outgoing email."
      state={state}
      successMessage="General settings saved."
    >
      {(form) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="siteName">Site name</Label>
              <Input
                id="siteName"
                value={form.siteName}
                onChange={(e) => state.set("siteName", e.target.value)}
                className="mt-1.5"
                maxLength={120}
              />
            </div>
            <div>
              <Label htmlFor="launchCity">Launch city</Label>
              <Input
                id="launchCity"
                value={form.launchCity}
                onChange={(e) => state.set("launchCity", e.target.value)}
                className="mt-1.5"
                placeholder="Ibadan"
              />
            </div>
          </div>

          <div className="mt-4">
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              value={form.tagline}
              onChange={(e) => state.set("tagline", e.target.value)}
              className="mt-1.5"
              maxLength={255}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              {form.tagline.length}/255 characters
            </p>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="contactEmail">Contact email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={form.contactEmail}
                onChange={(e) => state.set("contactEmail", e.target.value)}
                className="mt-1.5"
                placeholder="hello@mytijaara.com"
              />
            </div>
            <div>
              <Label htmlFor="supportEmail">Support email</Label>
              <Input
                id="supportEmail"
                type="email"
                value={form.supportEmail}
                onChange={(e) => state.set("supportEmail", e.target.value)}
                className="mt-1.5"
                placeholder="support@mytijaara.com"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => state.set("phone", e.target.value)}
                className="mt-1.5"
                placeholder="+234 800 000 0000"
              />
            </div>
            <div>
              <Label htmlFor="timezone">Timezone</Label>
              <Select value={form.timezone} onValueChange={(v) => state.set("timezone", v)}>
                <SelectTrigger id="timezone" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              rows={3}
              value={form.address}
              onChange={(e) => state.set("address", e.target.value)}
              className="mt-1.5"
              maxLength={500}
            />
          </div>
        </>
      )}
    </SettingsForm>
  );
}
