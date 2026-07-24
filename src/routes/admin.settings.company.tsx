import { createFileRoute } from "@tanstack/react-router";
import { SectionCard } from "@/components/admin/ui-bits";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/admin/settings/company")({
  component: () => (
    <SectionCard title="Company details">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><Label>Legal name</Label><Input defaultValue="MyTijaara Technologies Ltd." className="mt-1.5" /></div>
        <div><Label>RC number</Label><Input defaultValue="RC 1892374" className="mt-1.5" /></div>
        <div><Label>Country</Label><Input defaultValue="Nigeria" className="mt-1.5" /></div>
        <div><Label>State</Label><Input defaultValue="Lagos" className="mt-1.5" /></div>
      </div>
      <div className="mt-4"><Label>Registered address</Label><Textarea rows={3} defaultValue="14 Adeola Odeku Street, Victoria Island, Lagos, Nigeria" className="mt-1.5" /></div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div><Label>Support email</Label><Input defaultValue="support@mytijaara.com" className="mt-1.5" /></div>
        <div><Label>Support phone</Label><Input defaultValue="+234 800 123 4567" className="mt-1.5" /></div>
      </div>
    </SectionCard>
  ),
});
