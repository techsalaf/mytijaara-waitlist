import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SectionCard } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { settingsApi } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings/company")({
  component: CompanySettingsPage,
});

function CompanySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    legalName: "MyTijaara Technologies Ltd.",
    rcNumber: "RC 1892374",
    country: "Nigeria",
    state: "Lagos",
    registeredAddress: "14 Adeola Odeku Street, Victoria Island, Lagos, Nigeria",
    supportEmail: "support@mytijaara.com",
    supportPhone: "+234 800 123 4567",
  });

  useEffect(() => {
    let active = true;
    setLoading(true);
    void settingsApi.get("company").then((response) => {
      if (!active) return;
      const data = (response.data ?? {}) as Record<string, unknown>;
      setForm((prev) => ({ ...prev, legalName: String(data.legalName ?? prev.legalName), rcNumber: String(data.rcNumber ?? prev.rcNumber), country: String(data.country ?? prev.country), state: String(data.state ?? prev.state), registeredAddress: String(data.registeredAddress ?? prev.registeredAddress), supportEmail: String(data.supportEmail ?? prev.supportEmail), supportPhone: String(data.supportPhone ?? prev.supportPhone) }));
    }).catch(() => toast.error("Unable to load company settings.")).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await settingsApi.update("company", form);
      toast.success("Company details saved.");
    } catch {
      toast.error("Failed to save company details.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard title="Company details" actions={<Button size="sm" onClick={() => void save()} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save changes</Button>}>
      {loading ? <div className="text-sm text-muted-foreground">Loading settings…</div> : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label>Legal name</Label><Input value={form.legalName} onChange={(e) => setForm((prev) => ({ ...prev, legalName: e.target.value }))} className="mt-1.5" /></div>
            <div><Label>RC number</Label><Input value={form.rcNumber} onChange={(e) => setForm((prev) => ({ ...prev, rcNumber: e.target.value }))} className="mt-1.5" /></div>
            <div><Label>Country</Label><Input value={form.country} onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))} className="mt-1.5" /></div>
            <div><Label>State</Label><Input value={form.state} onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value }))} className="mt-1.5" /></div>
          </div>
          <div className="mt-4"><Label>Registered address</Label><Textarea rows={3} value={form.registeredAddress} onChange={(e) => setForm((prev) => ({ ...prev, registeredAddress: e.target.value }))} className="mt-1.5" /></div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div><Label>Support email</Label><Input value={form.supportEmail} onChange={(e) => setForm((prev) => ({ ...prev, supportEmail: e.target.value }))} className="mt-1.5" /></div>
            <div><Label>Support phone</Label><Input value={form.supportPhone} onChange={(e) => setForm((prev) => ({ ...prev, supportPhone: e.target.value }))} className="mt-1.5" /></div>
          </div>
        </>
      )}
    </SectionCard>
  );
}
