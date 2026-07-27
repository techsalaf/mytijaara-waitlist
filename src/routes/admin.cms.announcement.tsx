import { createFileRoute } from "@tanstack/react-router";
import { SectionCard } from "@/components/admin/ui-bits";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Megaphone } from "lucide-react";

export const Route = createFileRoute("/admin/cms/announcement")({
  component: () => (
    <div className="grid gap-4 lg:grid-cols-2">
      <SectionCard title="Announcement bar" description="Shows at the top of every page">
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
            <div>
              <div className="text-sm font-medium">Enable announcement bar</div>
              <div className="text-xs text-muted-foreground">Currently visible on production</div>
            </div>
            <Switch defaultChecked />
          </div>
          <div><Label>Message</Label><Input defaultValue="🚀 Early access opens August 15 — join the waitlist now." className="mt-1.5" /></div>
          <div><Label>Link label</Label><Input defaultValue="Join now" className="mt-1.5" /></div>
          <div><Label>Link URL</Label><Input defaultValue="#join" className="mt-1.5" /></div>
          <div>
            <Label>Style</Label>
            <Select defaultValue="primary">
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="primary">Primary green</SelectItem>
                <SelectItem value="gold">Premium gold</SelectItem>
                <SelectItem value="dark">Dark forest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </SectionCard>
      <SectionCard title="Preview">
        <div className="rounded-lg bg-primary px-4 py-2.5 text-center text-sm text-white">
          <Megaphone className="mr-1.5 inline h-4 w-4" />
          🚀 Early access opens August 15 — join the waitlist now.{" "}
          <a href="#" className="ml-2 font-semibold underline">Join now →</a>
        </div>
      </SectionCard>
    </div>
  ),
});
