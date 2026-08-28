/**
 * `/admin/data-room/settings` — the room-wide policy and the emergency controls.
 *
 * Writes here need `data-room.manage-settings`, which the plain `admin` role is
 * deliberately not given. A 403 on save is the design working.
 *
 * Every setting is a ceiling the environment can lower but not raise. Where
 * `config/dataroom.php` is stricter, the field says so next to the input instead
 * of quietly accepting a value that will not take effect.
 *
 * The PIN is write-only. It is bcrypt-hashed server-side and never returned, so
 * this form can say whether one is configured but never show it.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { SectionCard } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ConfirmationModal, loadState } from "@/components/admin/dataroom/bits";
import { errorMessage, useResource } from "@/components/admin/dataroom/use-resource";
import { dataRoomAdminApi, DATA_ROOM_EMERGENCY_PHRASES } from "@/lib/api/dataroom-admin";
import type {
  DataRoomEmergencyAction,
  DataRoomPolicySnapshot,
  DataRoomSettingsPatch,
} from "@/lib/api/dataroom-admin";
import { EMERGENCY_DESCRIPTORS } from "@/lib/dataroom/admin-format";

export const Route = createFileRoute("/admin/data-room/settings")({
  component: DataRoomSettingsRoute,
});

type FormState = {
  enabled: boolean;
  globalPinEnabled: boolean;
  globalPin: string;
  defaultAccessDurationDays: string;
  sessionTimeoutMinutes: string;
  maxFailedAttempts: string;
  downloadsEnabled: boolean;
  watermarkEnabled: boolean;
  auditLoggingEnabled: boolean;
};

function formFrom(policy: DataRoomPolicySnapshot): FormState {
  return {
    enabled: policy.enabled,
    globalPinEnabled: policy.globalPinEnabled,
    globalPin: "",
    defaultAccessDurationDays: String(policy.defaultAccessDurationDays),
    sessionTimeoutMinutes: String(policy.sessionTimeoutMinutes),
    maxFailedAttempts: String(policy.maxFailedAttempts),
    downloadsEnabled: policy.downloadsEnabled,
    watermarkEnabled: policy.watermarkEnabled,
    auditLoggingEnabled: policy.auditLoggingEnabled,
  };
}

/** An integer field, or `undefined` when it is blank or not a number. */
function intOrUndefined(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : undefined;
}

/**
 * Only the changed fields are sent. A PATCH that echoes every value back would
 * write an `admin_updated_settings` audit row claiming the operator changed nine
 * things when they changed one.
 */
function patchFrom(form: FormState, policy: DataRoomPolicySnapshot): DataRoomSettingsPatch {
  const patch: DataRoomSettingsPatch = {};
  if (form.enabled !== policy.enabled) patch.enabled = form.enabled;
  if (form.globalPinEnabled !== policy.globalPinEnabled)
    patch.global_pin_enabled = form.globalPinEnabled;
  if (form.globalPin.trim()) patch.global_pin = form.globalPin.trim();
  if (form.downloadsEnabled !== policy.downloadsEnabled)
    patch.downloads_enabled = form.downloadsEnabled;
  if (form.watermarkEnabled !== policy.watermarkEnabled)
    patch.watermark_enabled = form.watermarkEnabled;
  if (form.auditLoggingEnabled !== policy.auditLoggingEnabled)
    patch.audit_logging_enabled = form.auditLoggingEnabled;

  const days = intOrUndefined(form.defaultAccessDurationDays);
  if (days !== undefined && days !== policy.defaultAccessDurationDays)
    patch.default_access_duration_days = days;
  const idle = intOrUndefined(form.sessionTimeoutMinutes);
  if (idle !== undefined && idle !== policy.sessionTimeoutMinutes)
    patch.session_timeout_minutes = idle;
  const attempts = intOrUndefined(form.maxFailedAttempts);
  if (attempts !== undefined && attempts !== policy.maxFailedAttempts)
    patch.max_failed_attempts = attempts;

  return patch;
}

const EMERGENCY_ORDER: DataRoomEmergencyAction[] = [
  "lock_room",
  "unlock_room",
  "revoke_all_sessions",
  "disable_all_downloads",
  "enable_all_downloads",
  "disable_all_grants",
];

/** The controls whose inverse is already in effect are pointless, so they hide. */
function visibleEmergencyActions(policy: DataRoomPolicySnapshot): DataRoomEmergencyAction[] {
  return EMERGENCY_ORDER.filter((action) => {
    if (action === "lock_room") return !policy.emergencyLockdown;
    if (action === "unlock_room") return policy.emergencyLockdown;
    if (action === "disable_all_downloads") return policy.downloadsEnabled;
    if (action === "enable_all_downloads") return !policy.downloadsEnabled;
    return true;
  });
}

function DataRoomSettingsRoute() {
  const load = useCallback(async () => (await dataRoomAdminApi.settings()).data, []);
  const res = useResource(load, "Could not load the data room settings.");

  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<DataRoomEmergencyAction | null>(null);
  const [emergencyBusy, setEmergencyBusy] = useState(false);

  // The form is seeded from the server and reseeded after every successful write,
  // so what is on screen is always something the server confirmed.
  useEffect(() => {
    if (res.data) setForm(formFrom(res.data));
  }, [res.data]);

  const state = loadState({
    loading: res.loading,
    error: res.error,
    forbidden: res.forbidden,
    onRetry: () => void res.reload(),
    label: "the data room settings",
  });
  if (state || !res.data || !form) return state;

  const policy = res.data;
  const patch = patchFrom(form, policy);
  const dirty = Object.keys(patch).length > 0;

  async function save() {
    if (!dirty) return;
    setSaving(true);
    try {
      const result = await dataRoomAdminApi.updateSettings(patch);
      res.set(result.data);
      toast.success("Settings saved.");
    } catch (error) {
      toast.error(
        errorMessage(
          error,
          "The change was refused. Saving here needs the data-room.manage-settings permission.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function runEmergency(action: DataRoomEmergencyAction) {
    setEmergencyBusy(true);
    try {
      const result = await dataRoomAdminApi.emergency(action, DATA_ROOM_EMERGENCY_PHRASES[action]);
      res.set(result.data.policy);
      const parts = [EMERGENCY_DESCRIPTORS[action].title + " applied."];
      if (result.data.sessionsDestroyed !== undefined)
        parts.push(`${result.data.sessionsDestroyed} live session(s) ended.`);
      if (result.data.grantsSuspended !== undefined)
        parts.push(`${result.data.grantsSuspended} grant(s) suspended.`);
      toast.success(parts.join(" "));
      setPending(null);
    } catch (error) {
      toast.error(errorMessage(error, "The control was refused."));
    } finally {
      setEmergencyBusy(false);
    }
  }

  const idleCeiling = policy.environment.idleTimeoutCeilingMinutes;
  const idleAsked = intOrUndefined(form.sessionTimeoutMinutes);

  return (
    <div className="space-y-6">
      {policy.emergencyLockdown && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm"
        >
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
          <div>
            <p className="font-semibold">The room is locked down.</p>
            <p className="text-muted-foreground">
              No visitor can sign in and every session was destroyed. Use Unlock the data room below
              when you are ready.
            </p>
          </div>
        </div>
      )}

      <SectionCard
        title="Room policy"
        description="Settings are a ceiling the environment can lower but not raise. Where config/dataroom.php is stricter, the stricter value is what the server actually enforces."
        actions={
          <Button size="sm" disabled={!dirty || saving} onClick={() => void save()}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            {dirty ? "Save changes" : "Saved"}
          </Button>
        }
      >
        <div className="space-y-5">
          <ToggleRow
            id="setting-enabled"
            label="Data room enabled"
            hint={
              policy.environment.enabled
                ? "Off means nobody can sign in, whatever their grant says."
                : "DATA_ROOM_ENABLED is false in the environment, so the room stays closed even with this on."
            }
            checked={form.enabled}
            onChange={(v) => setForm({ ...form, enabled: v })}
          />

          <ToggleRow
            id="setting-pin"
            label="Global PIN barrier"
            hint={
              policy.environment.pinPinnedByEnvironment
                ? "DATA_ROOM_MASTER_PIN_HASH is set in the environment. That hash is what the server checks; a PIN typed here will not replace it."
                : policy.globalPinConfigured
                  ? "A PIN is configured. It is bcrypt-hashed and cannot be shown, only replaced."
                  : "No PIN is configured yet. Enabling this without setting one below would lock everyone out."
            }
            checked={form.globalPinEnabled}
            onChange={(v) => setForm({ ...form, globalPinEnabled: v })}
          />

          <div className="max-w-sm space-y-1.5">
            <Label htmlFor="setting-pin-value" className="text-xs">
              Set a new global PIN
            </Label>
            <Input
              id="setting-pin-value"
              type="password"
              autoComplete="new-password"
              placeholder={policy.globalPinConfigured ? "Leave blank to keep the current PIN" : ""}
              value={form.globalPin}
              onChange={(e) => setForm({ ...form, globalPin: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Write-only. Sent over HTTPS, hashed server-side, never returned to this page. Deliver
              it to visitors yourself; it is not emailed.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <NumberField
              id="setting-duration"
              label="Default grant duration (days)"
              value={form.defaultAccessDurationDays}
              onChange={(v) => setForm({ ...form, defaultAccessDurationDays: v })}
              hint="What the grant wizard preselects. Per-grant choices override it."
            />
            <NumberField
              id="setting-idle"
              label="Idle timeout (minutes)"
              value={form.sessionTimeoutMinutes}
              onChange={(v) => setForm({ ...form, sessionTimeoutMinutes: v })}
              hint={
                idleAsked !== undefined && idleAsked > idleCeiling
                  ? `The environment caps this at ${idleCeiling} minutes, so ${idleAsked} will not take effect. Enforced now: ${policy.effectiveIdleTimeoutMinutes} minutes.`
                  : `Enforced now: ${policy.effectiveIdleTimeoutMinutes} minutes. Absolute session lifetime is ${policy.effectiveAbsoluteTtlMinutes} minutes and is environment-only.`
              }
            />
            <NumberField
              id="setting-attempts"
              label="Max failed attempts"
              value={form.maxFailedAttempts}
              onChange={(v) => setForm({ ...form, maxFailedAttempts: v })}
              hint={
                policy.effectiveMaxFailedAttempts !== policy.maxFailedAttempts
                  ? `The environment enforces ${policy.effectiveMaxFailedAttempts}.`
                  : "Failures per identifier before the lockout window starts."
              }
            />
          </div>

          <ToggleRow
            id="setting-downloads"
            label="Downloads permitted room-wide"
            hint="A ceiling. A visitor still needs download permission on the grant and on the document."
            checked={form.downloadsEnabled}
            onChange={(v) => setForm({ ...form, downloadsEnabled: v })}
          />

          <ToggleRow
            id="setting-watermark"
            label="Watermark previews"
            hint={
              policy.environment.watermarkEnabled
                ? "Stamps the visitor's email and the timestamp onto PDF previews. Deterrence and traceability, not copy prevention."
                : "DATA_ROOM_WATERMARK_ENABLED is false in the environment, so nothing is stamped whatever this says."
            }
            checked={form.watermarkEnabled}
            onChange={(v) => setForm({ ...form, watermarkEnabled: v })}
          />

          <ToggleRow
            id="setting-audit"
            label="Audit logging"
            hint="Turning this off stops new rows being written. Existing rows are never deleted by the application."
            checked={form.auditLoggingEnabled}
            onChange={(v) => setForm({ ...form, auditLoggingEnabled: v })}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Environment ceilings"
        description="Read-only. These come from config/dataroom.php and the server environment, not from this page. Changing them needs a deploy."
      >
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <EnvRow label="DATA_ROOM_ENABLED">{policy.environment.enabled ? "true" : "false"}</EnvRow>
          <EnvRow label="Master PIN hash pinned">
            {policy.environment.pinPinnedByEnvironment ? "yes" : "no"}
          </EnvRow>
          <EnvRow label="Watermarking">
            {policy.environment.watermarkEnabled ? "available" : "off"}
          </EnvRow>
          <EnvRow label="Idle timeout ceiling">{idleCeiling} minutes</EnvRow>
          <EnvRow label="Absolute session lifetime">
            {policy.environment.absoluteTtlMinutes} minutes
          </EnvRow>
          <EnvRow label="Storage disk">{policy.environment.storageDisk}</EnvRow>
          <EnvRow label="Malware scanning">
            {policy.environment.malwareScanning
              ? "provisioned"
              : "not provisioned. Uploads are validated by type, extension, size and magic bytes, then stored unscanned."}
          </EnvRow>
        </dl>
      </SectionCard>

      <SectionCard
        title="Emergency controls"
        description="Each one takes effect immediately and asks for a typed phrase first. The effect and the reversal are stated before you confirm."
      >
        <ul className="space-y-3">
          {visibleEmergencyActions(policy).map((action) => {
            const descriptor = EMERGENCY_DESCRIPTORS[action];
            return (
              <li
                key={action}
                className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border/60 px-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{descriptor.title}</p>
                  <p className="text-xs text-muted-foreground">{descriptor.effect}</p>
                  <p className="text-xs text-muted-foreground">{descriptor.reversal}</p>
                </div>
                <Button
                  size="sm"
                  variant={descriptor.destructive ? "destructive" : "outline"}
                  onClick={() => setPending(action)}
                >
                  {descriptor.title}
                </Button>
              </li>
            );
          })}
        </ul>
      </SectionCard>

      {pending && (
        <ConfirmationModal
          open
          onOpenChange={(open) => {
            if (!open) setPending(null);
          }}
          title={EMERGENCY_DESCRIPTORS[pending].title}
          effect={EMERGENCY_DESCRIPTORS[pending].effect}
          reversal={EMERGENCY_DESCRIPTORS[pending].reversal}
          phrase={DATA_ROOM_EMERGENCY_PHRASES[pending]}
          destructive={EMERGENCY_DESCRIPTORS[pending].destructive}
          confirmLabel={EMERGENCY_DESCRIPTORS[pending].title}
          busy={emergencyBusy}
          onConfirm={() => void runEmergency(pending)}
        />
      )}
    </div>
  );
}

function ToggleRow({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <Label htmlFor={id} className="text-sm">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input id={id} inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value)} />
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function EnvRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-2 border-b border-border/40 py-1.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 font-mono text-xs">{children}</dd>
    </div>
  );
}
