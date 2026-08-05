import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SettingsForm } from "@/components/admin/settings-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, CheckCircle2, Loader2, Plug } from "lucide-react";
import { settingsApi } from "@/lib/api/settings";
import { useSettingsGroup, settingsError } from "@/lib/admin/use-settings-group";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings/smtp")({
  component: SmtpSettingsPage,
});

/**
 * The `smtp` group. The old version posted `provider` and `replyTo`, which the
 * backend does not accept, and showed a hardcoded "Connected" badge next to a
 * "Send test email" button that did nothing. Connection status here comes from
 * an actual SMTP handshake via `POST /settings/smtp/test`.
 *
 * `password` arrives as the redaction placeholder when one is stored. Posting
 * it back is dropped server-side in `stripRedacted()`, so leaving the field
 * untouched cannot wipe the stored secret.
 */
const DEFAULTS = {
  enabled: false,
  host: "",
  port: 587,
  encryption: "tls",
  username: "",
  password: "",
  fromAddress: "",
  fromName: "MyTijaara",
};

const PORT_HINTS: Record<string, number> = { tls: 587, ssl: 465, none: 25 };

type TestState =
  | { status: "idle" }
  | { status: "testing" }
  | { status: "ok"; message: string }
  | { status: "failed"; message: string };

function SmtpSettingsPage() {
  const state = useSettingsGroup("smtp", DEFAULTS);
  const [test, setTest] = useState<TestState>({ status: "idle" });

  const runTest = async () => {
    if (!state.form) return;
    setTest({ status: "testing" });
    try {
      // Send the form values so credentials can be checked before saving. A
      // redacted password falls back to the stored one server-side.
      const res = await settingsApi.testSmtp({
        host: state.form.host,
        port: state.form.port,
        encryption: state.form.encryption as "tls" | "ssl" | "none",
        username: state.form.username,
        password: state.form.password,
      });
      setTest({ status: "ok", message: res.data.message });
      toast.success(res.data.message);
    } catch (err) {
      const message = settingsError(err, "The SMTP connection failed.");
      setTest({ status: "failed", message });
      toast.error(message);
    }
  };

  const canTest = Boolean(state.form?.host?.trim()) && !state.loading;

  return (
    <SettingsForm
      title="SMTP / Email"
      description="How the app sends the waitlist welcome email and campaigns."
      state={state}
      successMessage="SMTP settings saved."
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => void runTest()}
          disabled={!canTest || test.status === "testing"}
          title={!canTest ? "Enter an SMTP host first" : undefined}
        >
          {test.status === "testing" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plug className="mr-2 h-4 w-4" />
          )}
          {test.status === "testing" ? "Connecting…" : "Test connection"}
        </Button>
      }
    >
      {(form) => (
        <>
          {test.status === "ok" && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{test.message}</span>
            </div>
          )}
          {test.status === "failed" && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <div className="font-semibold">The connection was refused</div>
                <p className="mt-0.5 text-xs text-red-600">{test.message}</p>
              </div>
            </div>
          )}

          <div className="flex items-start justify-between gap-4 rounded-xl border border-border/60 p-4">
            <div>
              <div className="text-sm font-medium">Send email through SMTP</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                Off means no welcome email and no campaign delivery. Signups are still recorded.
              </div>
            </div>
            <Switch checked={form.enabled} onCheckedChange={(v) => state.set("enabled", v)} />
          </div>

          {/* The credential fields are pointless while delivery is off. */}
          <fieldset disabled={!form.enabled} className="mt-4 disabled:opacity-50">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="host">SMTP host</Label>
                <Input
                  id="host"
                  value={form.host}
                  onChange={(e) => state.set("host", e.target.value)}
                  placeholder="smtp.postmarkapp.com"
                  className="mt-1.5"
                  disabled={!form.enabled}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="encryption">Security</Label>
                  <Select
                    value={form.encryption}
                    onValueChange={(v) => {
                      state.patch({ encryption: v, port: PORT_HINTS[v] ?? form.port });
                    }}
                    disabled={!form.enabled}
                  >
                    <SelectTrigger id="encryption" className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tls">TLS / STARTTLS</SelectItem>
                      <SelectItem value="ssl">SSL</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="port">Port</Label>
                  <Input
                    id="port"
                    type="number"
                    min={1}
                    max={65535}
                    value={form.port}
                    onChange={(e) => state.set("port", Number(e.target.value) || 0)}
                    className="mt-1.5"
                    disabled={!form.enabled}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={form.username}
                  onChange={(e) => state.set("username", e.target.value)}
                  autoComplete="off"
                  className="mt-1.5"
                  disabled={!form.enabled}
                />
              </div>
              <div>
                <Label htmlFor="password">Password / API key</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => state.set("password", e.target.value)}
                  autoComplete="new-password"
                  className="mt-1.5"
                  disabled={!form.enabled}
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {form.password.startsWith("••••")
                    ? "A password is stored. Leave this as-is to keep it, or type a new one to replace it."
                    : "No password stored yet."}
                </p>
              </div>
              <div>
                <Label htmlFor="fromAddress">From address</Label>
                <Input
                  id="fromAddress"
                  type="email"
                  value={form.fromAddress}
                  onChange={(e) => state.set("fromAddress", e.target.value)}
                  placeholder="hello@mytijaara.com"
                  className="mt-1.5"
                  disabled={!form.enabled}
                />
              </div>
              <div>
                <Label htmlFor="fromName">From name</Label>
                <Input
                  id="fromName"
                  value={form.fromName}
                  onChange={(e) => state.set("fromName", e.target.value)}
                  className="mt-1.5"
                  maxLength={120}
                  disabled={!form.enabled}
                />
              </div>
            </div>
          </fieldset>
        </>
      )}
    </SettingsForm>
  );
}
