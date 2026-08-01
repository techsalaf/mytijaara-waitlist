import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SectionCard } from "@/components/admin/ui-bits";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2 } from "lucide-react";
import { settingsApi } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings/smtp")({
  component: SmtpSettingsPage,
});

function SmtpSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ provider: "postmark", fromAddress: "hello@mytijaara.com", fromName: "MyTijaara", replyTo: "support@mytijaara.com", host: "smtp.postmarkapp.com", port: "587", username: "••••••••", password: "••••••••••••••••" });

  useEffect(() => {
    let active = true;
    setLoading(true);
    void settingsApi.get("smtp").then((response) => {
      if (!active) return;
      const data = (response.data ?? {}) as Record<string, unknown>;
      setForm((prev) => ({ ...prev, provider: String(data.provider ?? prev.provider), fromAddress: String(data.fromAddress ?? prev.fromAddress), fromName: String(data.fromName ?? prev.fromName), replyTo: String(data.replyTo ?? prev.replyTo), host: String(data.host ?? prev.host), port: String(data.port ?? prev.port), username: String(data.username ?? prev.username), password: String(data.password ?? prev.password) }));
    }).catch(() => toast.error("Unable to load SMTP settings.")).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await settingsApi.update("smtp", form);
      toast.success("SMTP settings saved.");
    } catch {
      toast.error("Failed to save SMTP settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard title="SMTP settings" description="How the app sends transactional and campaign emails" actions={<><Badge className="bg-emerald-50 text-emerald-700"><CheckCircle2 className="mr-1 h-3 w-3" /> Connected</Badge><Button size="sm" onClick={() => void save()} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save</Button></>}>
      {loading ? <div className="text-sm text-muted-foreground">Loading settings…</div> : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Provider</Label>
              <Select value={form.provider} onValueChange={(value) => setForm((prev) => ({ ...prev, provider: value }))}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="postmark">Postmark</SelectItem>
                  <SelectItem value="sendgrid">SendGrid</SelectItem>
                  <SelectItem value="ses">Amazon SES</SelectItem>
                  <SelectItem value="mailgun">Mailgun</SelectItem>
                  <SelectItem value="custom">Custom SMTP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>From address</Label><Input value={form.fromAddress} onChange={(e) => setForm((prev) => ({ ...prev, fromAddress: e.target.value }))} className="mt-1.5" /></div>
            <div><Label>From name</Label><Input value={form.fromName} onChange={(e) => setForm((prev) => ({ ...prev, fromName: e.target.value }))} className="mt-1.5" /></div>
            <div><Label>Reply-to</Label><Input value={form.replyTo} onChange={(e) => setForm((prev) => ({ ...prev, replyTo: e.target.value }))} className="mt-1.5" /></div>
            <div><Label>SMTP host</Label><Input value={form.host} onChange={(e) => setForm((prev) => ({ ...prev, host: e.target.value }))} className="mt-1.5" /></div>
            <div><Label>Port</Label><Input value={form.port} onChange={(e) => setForm((prev) => ({ ...prev, port: e.target.value }))} className="mt-1.5" /></div>
            <div><Label>Username</Label><Input value={form.username} onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))} className="mt-1.5" /></div>
            <div><Label>Password / API key</Label><Input type="password" value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} className="mt-1.5" /></div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="outline">Send test email</Button>
          </div>
        </>
      )}
    </SectionCard>
  );
}
