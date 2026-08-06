import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SectionCard } from "@/components/admin/ui-bits";
import { SettingsForm } from "@/components/admin/settings-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { HardDrive, Loader2, Trash2, X } from "lucide-react";
import { settingsApi } from "@/lib/api/settings";
import { useSettingsGroup, settingsError } from "@/lib/admin/use-settings-group";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings/system")({
  component: SystemSettingsPage,
});

/**
 * The `system` group. This page previously showed a backup schedule, a cache
 * size and a hit rate that no endpoint produced, plus a "Delete workspace"
 * button wired to nothing. Everything here is backed by
 * `SettingsController::rules('system')` or `POST /settings/cache/purge`.
 */
const DEFAULTS = {
  maintenanceMode: false,
  signupsPaused: false,
  signupRateLimitPerHour: 10,
  weeklyDigestEnabled: false,
  weeklyDigestDay: "mon",
  weeklyDigestRecipients: [] as string[],
  notifyOnSignup: true,
};

const DAYS = [
  { id: "mon", label: "Monday" },
  { id: "tue", label: "Tuesday" },
  { id: "wed", label: "Wednesday" },
  { id: "thu", label: "Thursday" },
  { id: "fri", label: "Friday" },
  { id: "sat", label: "Saturday" },
  { id: "sun", label: "Sunday" },
];

function SystemSettingsPage() {
  const state = useSettingsGroup("system", DEFAULTS);

  return (
    <div className="space-y-4">
      <SettingsForm
        title="Availability"
        description="Controls that take the public site or the signup form offline."
        state={state}
        successMessage="System settings saved."
      >
        {(form) => (
          <>
            <div className="space-y-3">
              <Toggle
                label="Maintenance mode"
                description="Visitors see a maintenance page instead of the landing page. The admin stays reachable."
                checked={form.maintenanceMode}
                onChange={(v) => state.set("maintenanceMode", v)}
                danger
              />
              <Toggle
                label="Pause signups"
                description="The waitlist form stops accepting entries and says so, instead of failing silently."
                checked={form.signupsPaused}
                onChange={(v) => state.set("signupsPaused", v)}
                danger
              />
              <Toggle
                label="Notify me on every signup"
                description="Sends an admin notification each time someone joins the waitlist."
                checked={form.notifyOnSignup}
                onChange={(v) => state.set("notifyOnSignup", v)}
              />
            </div>

            <div className="mt-4 rounded-xl border border-border/60 p-4">
              <Label htmlFor="rate">Signup rate limit</Label>
              <div className="mt-1.5 flex items-center gap-2">
                <Input
                  id="rate"
                  type="number"
                  min={1}
                  max={1000}
                  value={form.signupRateLimitPerHour}
                  onChange={(e) =>
                    state.set("signupRateLimitPerHour", Number(e.target.value) || 1)
                  }
                  className="w-28"
                />
                <span className="text-sm text-muted-foreground">requests per hour, per IP</span>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Between 1 and 1000. Too low and a shared office network gets blocked; too high and
                a script can flood the list.
              </p>
            </div>

            <div className="mt-4 rounded-xl border border-border/60 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Weekly digest</div>
                  <div className="text-xs text-muted-foreground">
                    A summary of signups, referrals and campaign results.
                  </div>
                </div>
                <Switch
                  checked={form.weeklyDigestEnabled}
                  onCheckedChange={(v) => state.set("weeklyDigestEnabled", v)}
                />
              </div>

              {/* Nothing below matters until the digest is on, so it is disabled
                  rather than left editable and ignored. */}
              <fieldset
                disabled={!form.weeklyDigestEnabled}
                className="mt-4 space-y-3 disabled:opacity-50"
              >
                <div className="max-w-xs">
                  <Label htmlFor="digest-day">Send on</Label>
                  <Select
                    value={form.weeklyDigestDay}
                    onValueChange={(v) => state.set("weeklyDigestDay", v)}
                    disabled={!form.weeklyDigestEnabled}
                  >
                    <SelectTrigger id="digest-day" className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <RecipientList
                  disabled={!form.weeklyDigestEnabled}
                  value={form.weeklyDigestRecipients}
                  onChange={(next) => state.set("weeklyDigestRecipients", next)}
                />
              </fieldset>
            </div>
          </>
        )}
      </SettingsForm>

      <CacheCard />
    </div>
  );
}

function Toggle({
  label, description, checked, onChange, danger = false,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  danger?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border/60 p-4">
      <div>
        <div className="flex items-center gap-2 text-sm font-medium">
          {label}
          {danger && checked && (
            <Badge className="bg-amber-50 text-[10px] text-amber-700">Active</Badge>
          )}
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

/** Email recipients for the digest. Validated here so the save is not wasted. */
function RecipientList({
  value, onChange, disabled,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  disabled: boolean;
}) {
  const [draft, setDraft] = useState("");
  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(draft.trim());
  const duplicate = value.includes(draft.trim().toLowerCase());

  const add = () => {
    const email = draft.trim().toLowerCase();
    if (!valid || duplicate) return;
    onChange([...value, email]);
    setDraft("");
  };

  return (
    <div>
      <Label>Recipients</Label>
      <div className="mt-1.5 flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="name@mytijaara.com"
          disabled={disabled}
        />
        <Button
          type="button"
          variant="outline"
          onClick={add}
          disabled={disabled || !valid || duplicate}
          title={
            !draft.trim()
              ? "Enter an email address"
              : !valid
                ? "That is not a valid email address"
                : duplicate
                  ? "Already on the list"
                  : undefined
          }
        >
          Add
        </Button>
      </div>
      {value.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          No recipients yet. The digest will not be sent to anyone.
        </p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {value.map((email) => (
            <span
              key={email}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs"
            >
              {email}
              <button
                type="button"
                onClick={() => onChange(value.filter((e) => e !== email))}
                disabled={disabled}
                className="text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${email}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Cache purge. Reports the store and the entry count the backend actually saw,
 * so this says what was cleared instead of claiming a made-up size.
 */
function CacheCard() {
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<{ store: string; entries: number | null; at: string } | null>(
    null,
  );

  const purge = async () => {
    setBusy(true);
    try {
      const res = await settingsApi.purgeCache();
      setLast({
        store: res.data.store,
        entries: res.data.entriesCleared,
        at: res.data.purgedAt,
      });
      toast.success(
        res.data.entriesCleared === null
          ? `The ${res.data.store} cache was flushed.`
          : `Flushed ${res.data.entriesCleared} cache ${
              res.data.entriesCleared === 1 ? "entry" : "entries"
            }.`,
      );
    } catch (err) {
      toast.error(settingsError(err, "The cache store refused the flush."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard title="Cache">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-muted">
            <HardDrive className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold">Application cache</div>
            <div className="text-xs text-muted-foreground">
              {last
                ? `Last purged ${new Date(last.at).toLocaleTimeString()} · ${
                    last.entries === null ? last.store : `${last.entries} entries · ${last.store}`
                  }`
                : "Clears cached settings, CMS sections and dashboard aggregates."}
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => void purge()} disabled={busy}>
          {busy ? (
            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
          ) : (
            <Trash2 className="mr-2 h-3 w-3" />
          )}
          {busy ? "Purging…" : "Purge cache"}
        </Button>
      </div>
    </SectionCard>
  );
}
