import { createFileRoute } from "@tanstack/react-router";
import { SectionCard } from "@/components/admin/ui-bits";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/admin/settings/")({
  component: () => (
    <SectionCard title="General">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><Label>Workspace name</Label><Input defaultValue="MyTijaara" className="mt-1.5" /></div>
        <div><Label>Site URL</Label><Input defaultValue="https://mytijaara.com" className="mt-1.5" /></div>
        <div>
          <Label>Timezone</Label>
          <Select defaultValue="wat"><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent>
            <SelectItem value="wat">West Africa Time (WAT)</SelectItem>
            <SelectItem value="utc">UTC</SelectItem>
            <SelectItem value="gmt">GMT</SelectItem>
          </SelectContent></Select>
        </div>
        <div>
          <Label>Default language</Label>
          <Select defaultValue="en"><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="ha">Hausa</SelectItem>
            <SelectItem value="yo">Yoruba</SelectItem>
            <SelectItem value="ig">Igbo</SelectItem>
          </SelectContent></Select>
        </div>
      </div>
      <div className="mt-6 space-y-3">
        {[
          { label: "Enable public waitlist", desc: "Users can join from the landing page", on: true },
          { label: "Require email verification", desc: "Users must verify before appearing in exports", on: true },
          { label: "Maintenance mode", desc: "Show a maintenance page to visitors", on: false },
        ].map((p, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
            <div><div className="text-sm font-medium">{p.label}</div><div className="text-xs text-muted-foreground">{p.desc}</div></div>
            <Switch defaultChecked={p.on} />
          </div>
        ))}
      </div>
    </SectionCard>
  ),
});
