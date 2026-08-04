import { createFileRoute } from "@tanstack/react-router";
import { SectionCard } from "@/components/admin/ui-bits";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Megaphone, Loader2, Save } from "lucide-react";
import { useCmsSection } from "@/lib/hooks/useCmsSection";

type AnnouncementData = {
  text?: string;
  href?: string;
  label?: string;
  style?: "primary" | "gold" | "dark";
};

const defaultAnnouncementData: AnnouncementData = {
  text: "",
  href: "",
  label: "",
  style: "primary",
};

export const Route = createFileRoute("/admin/cms/announcement")({
  component: AnnouncementEditor,
});

function AnnouncementEditor() {
  const { data, setData, enabled, setEnabled, loading, saving, save } = useCmsSection<AnnouncementData>(
    "announcement",
    defaultAnnouncementData,
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SectionCard
        title="Announcement bar"
        description="Shows at the top of every page"
        actions={
          <button
            type="button"
            className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
            onClick={save}
            disabled={loading || saving}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save
          </button>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
            <div>
              <div className="text-sm font-medium">Enable announcement bar</div>
              <div className="text-xs text-muted-foreground">Currently visible on production</div>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
          <div>
            <Label>Message</Label>
            <Input
              value={data.text ?? ""}
              onChange={(e) => setData({ ...data, text: e.target.value })}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Link label</Label>
            <Input
              value={data.label ?? ""}
              onChange={(e) => setData({ ...data, label: e.target.value })}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Link URL</Label>
            <Input
              value={data.href ?? ""}
              onChange={(e) => setData({ ...data, href: e.target.value })}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Style</Label>
            <Select
              value={data.style ?? "primary"}
              onValueChange={(value) => setData({ ...data, style: value as AnnouncementData["style"] })}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
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
        <div className="rounded-lg bg-primary px-4 py-2.5 text-center text-sm text-primary-foreground">
          <Megaphone className="mr-1.5 inline h-4 w-4" />
          {data.text || "Announcement message"}
          <a href={data.href || "#"} className="ml-2 font-semibold underline">
            {data.label || "Learn more"} →
          </a>
        </div>
      </SectionCard>
    </div>
  );
}
