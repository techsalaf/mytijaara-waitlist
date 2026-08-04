import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { SectionCard } from "@/components/admin/ui-bits";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { GripVertical, Plus, Trash2, Loader2, Save } from "lucide-react";
import { useCmsSection } from "@/lib/hooks/useCmsSection";

type NavigationData = {
  logo?: string;
  links?: { label?: string; href?: string }[];
  cta?: { label?: string; href?: string };
};

const defaultNavigationData: NavigationData = {
  logo: "",
  links: [],
  cta: { label: "", href: "" },
};

export const Route = createFileRoute("/admin/cms/navigation")({
  component: NavigationEditor,
});

function NavigationEditor() {
  const { data, setData, enabled, setEnabled, loading, saving, save } = useCmsSection<NavigationData>(
    "navigation",
    defaultNavigationData,
  );

  const links = useMemo(() => data.links ?? [], [data.links]);

  const updateLink = (index: number, patch: Partial<{ label?: string; href?: string }>) => {
    setData({
      ...data,
      links: links.map((link, i) => (i === index ? { ...link, ...patch } : link)),
    });
  };

  const addLink = () => {
    setData({
      ...data,
      links: [...links, { label: "", href: "" }],
    });
  };

  const removeLink = (index: number) => {
    setData({
      ...data,
      links: links.filter((_, i) => i !== index),
    });
  };

  return (
    <SectionCard
      title="Site navigation"
      description="Header menu links"
      actions={
        <Button size="sm" onClick={save} disabled={loading || saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save changes
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
          <div>
            <div className="text-sm font-medium">Navigation section enabled</div>
            <div className="text-xs text-muted-foreground">Toggle whether the site navigation is published</div>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div>
          <Label>Brand logo text</Label>
          <Input
            value={data.logo ?? ""}
            onChange={(e) => setData({ ...data, logo: e.target.value })}
            className="mt-1"
          />
        </div>

        <div className="space-y-3">
          {links.map((link, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-border/60 p-3">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <div className="grid flex-1 gap-2 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Label</Label>
                  <Input
                    value={link.label ?? ""}
                    onChange={(e) => updateLink(i, { label: e.target.value })}
                    className="mt-1 h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">URL</Label>
                  <Input
                    value={link.href ?? ""}
                    onChange={(e) => updateLink(i, { href: e.target.value })}
                    className="mt-1 h-8"
                  />
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-500"
                onClick={() => removeLink(i)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <Button size="sm" variant="outline" onClick={addLink}>
          <Plus className="mr-2 h-4 w-4" /> Add link
        </Button>

        <div className="space-y-4 border-t border-border/60 pt-4">
          <div>
            <Label>Primary CTA label</Label>
            <Input
              value={data.cta?.label ?? ""}
              onChange={(e) => setData({ ...data, cta: { ...(data.cta ?? {}), label: e.target.value } })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Primary CTA URL</Label>
            <Input
              value={data.cta?.href ?? ""}
              onChange={(e) => setData({ ...data, cta: { ...(data.cta ?? {}), href: e.target.value } })}
              className="mt-1"
            />
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
