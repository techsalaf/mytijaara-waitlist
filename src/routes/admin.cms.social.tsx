import { createFileRoute } from "@tanstack/react-router";
import { SectionCard } from "@/components/admin/ui-bits";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Facebook, Instagram, Twitter, Youtube, Linkedin, Loader2, Save } from "lucide-react";
import { useCmsSection } from "@/lib/hooks/useCmsSection";

type SocialData = {
  twitter?: string;
  instagram?: string;
  facebook?: string;
  youtube?: string;
  linkedin?: string;
};

const defaultSocialData: SocialData = {
  twitter: "",
  instagram: "",
  facebook: "",
  youtube: "",
  linkedin: "",
};

export const Route = createFileRoute("/admin/cms/social")({
  component: SocialEditor,
});

function SocialEditor() {
  const { data, setData, enabled, setEnabled, loading, saving, save } = useCmsSection<SocialData>(
    "social",
    defaultSocialData,
  );

  return (
    <SectionCard
      title="Social links"
      actions={
        <Button size="sm" onClick={save} disabled={loading || saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save changes
        </Button>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
          <div>
            <div className="text-sm font-medium">Social section enabled</div>
            <div className="text-xs text-muted-foreground">Toggle whether social links are shown in the footer</div>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        {[
          { icon: Instagram, label: "Instagram", key: "instagram" as const },
          { icon: Twitter, label: "Twitter / X", key: "twitter" as const },
          { icon: Facebook, label: "Facebook", key: "facebook" as const },
          { icon: Youtube, label: "YouTube", key: "youtube" as const },
          { icon: Linkedin, label: "LinkedIn", key: "linkedin" as const },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.key} className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-muted"><Icon className="h-4 w-4" /></div>
              <div className="w-28 text-sm font-medium">{item.label}</div>
              <Input
                value={data[item.key] ?? ""}
                placeholder="https://…"
                onChange={(e) => setData({ ...data, [item.key]: e.target.value })}
                className="flex-1"
              />
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
