import { createFileRoute } from "@tanstack/react-router";
import { SectionCard } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Plus, Trash2 } from "lucide-react";
import { useCmsSection } from "@/lib/hooks/useCmsSection";

type ValueItem = { title: string; body?: string };
type AboutData = {
  hero?: { heading?: string; subheading?: string };
  mission?: { heading?: string; body?: string };
  vision?: { badge?: string; heading?: string; p1?: string; p2?: string; p3?: string };
  values?: { heading?: string; items?: ValueItem[] };
};

const defaultAboutData: AboutData = {
  hero: { heading: "", subheading: "" },
  mission: { heading: "", body: "" },
  vision: { badge: "", heading: "", p1: "", p2: "", p3: "" },
  values: { heading: "", items: [] },
};

export const Route = createFileRoute("/admin/cms/about")({
  component: AboutEditor,
});

function AboutEditor() {
  const { data, setData, enabled, setEnabled, loading, saving, save } = useCmsSection<AboutData>(
    "about",
    defaultAboutData,
  );

  const hero = data.hero ?? {};
  const mission = data.mission ?? {};
  const vision = data.vision ?? {};
  const values = data.values ?? { heading: "", items: [] };
  const items = values.items ?? [];

  const updateItem = (index: number, patch: Partial<ValueItem>) =>
    setData({
      ...data,
      values: {
        ...values,
        items: items.map((it, i) => (i === index ? { ...it, ...patch } : it)),
      },
    });

  const addItem = () =>
    setData({
      ...data,
      values: {
        ...values,
        items: [...items, { title: "", body: "" }],
      },
    });

  const removeItem = (index: number) =>
    setData({
      ...data,
      values: {
        ...values,
        items: items.filter((_, i) => i !== index),
      },
    });

  return (
    <div className="space-y-6">
      <SectionCard
        title="About Page Content"
        description="Edit the Hero, Mission, 'The Gojek of Africa' Vision narrative, and Core Values"
        actions={
          <Button size="sm" onClick={save} disabled={loading || saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save changes
          </Button>
        }
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
            <div>
              <div className="text-sm font-medium">About page section enabled</div>
              <div className="text-xs text-muted-foreground">Toggle visibility of about page CMS content</div>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          {/* Hero */}
          <div className="space-y-3 rounded-xl border border-border/60 p-4">
            <h3 className="text-sm font-semibold text-foreground">Hero Section</h3>
            <div>
              <Label className="text-xs">Hero Heading</Label>
              <Input
                value={hero.heading ?? ""}
                onChange={(e) => setData({ ...data, hero: { ...hero, heading: e.target.value } })}
                placeholder="The everyday operating system for Nigerian life & trade."
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Hero Subheading</Label>
              <Textarea
                value={hero.subheading ?? ""}
                onChange={(e) => setData({ ...data, hero: { ...hero, subheading: e.target.value } })}
                placeholder="One single platform that unifies daily commerce..."
                rows={2}
                className="mt-1"
              />
            </div>
          </div>

          {/* Mission */}
          <div className="space-y-3 rounded-xl border border-border/60 p-4">
            <h3 className="text-sm font-semibold text-foreground">Mission Section</h3>
            <div>
              <Label className="text-xs">Mission Heading</Label>
              <Input
                value={mission.heading ?? ""}
                onChange={(e) => setData({ ...data, mission: { ...mission, heading: e.target.value } })}
                placeholder="Our Mission & Commitment"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Mission Body</Label>
              <Textarea
                value={mission.body ?? ""}
                onChange={(e) => setData({ ...data, mission: { ...mission, body: e.target.value } })}
                placeholder="MyTijaara exists to eliminate friction from everyday commerce..."
                rows={3}
                className="mt-1"
              />
            </div>
          </div>

          {/* Vision & Moniker: The Gojek of Africa */}
          <div className="space-y-3 rounded-xl border border-gold/30 bg-gold/5 p-4">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-gold/20 px-2 py-0.5 text-xs font-bold text-gold-foreground">Moniker</span>
              <h3 className="text-sm font-semibold text-foreground">Why We Are Called &ldquo;The Gojek of Africa&rdquo;</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Badge Label</Label>
                <Input
                  value={vision.badge ?? ""}
                  onChange={(e) => setData({ ...data, vision: { ...vision, badge: e.target.value } })}
                  placeholder="The Vision & Moniker"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Card Heading</Label>
                <Input
                  value={vision.heading ?? ""}
                  onChange={(e) => setData({ ...data, vision: { ...vision, heading: e.target.value } })}
                  placeholder='Why we are called "The Gojek of Africa"'
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Paragraph 1 (Southeast Asia / Gojek reference)</Label>
              <Textarea
                value={vision.p1 ?? ""}
                onChange={(e) => setData({ ...data, vision: { ...vision, p1: e.target.value } })}
                placeholder="In Southeast Asia, Gojek transformed everyday life..."
                rows={2}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Paragraph 2 (African / Nigerian market context & WhatsApp reality)</Label>
              <Textarea
                value={vision.p2 ?? ""}
                onChange={(e) => setData({ ...data, vision: { ...vision, p2: e.target.value } })}
                placeholder="Across Nigeria and Africa, commerce already pulses through WhatsApp Status..."
                rows={2}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Paragraph 3 (MyTijaara's unified solution & escrow)</Label>
              <Textarea
                value={vision.p3 ?? ""}
                onChange={(e) => setData({ ...data, vision: { ...vision, p3: e.target.value } })}
                placeholder="MyTijaara is engineering that exact multi-service infrastructure for Africa..."
                rows={2}
                className="mt-1"
              />
            </div>
          </div>

          {/* Values */}
          <div className="space-y-4 rounded-xl border border-border/60 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Core Values</h3>
              <Button size="sm" variant="outline" onClick={addItem}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add Value
              </Button>
            </div>
            <div>
              <Label className="text-xs">Section Heading</Label>
              <Input
                value={values.heading ?? ""}
                onChange={(e) => setData({ ...data, values: { ...values, heading: e.target.value } })}
                placeholder="What drives everything we build"
                className="mt-1"
              />
            </div>
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 rounded-lg border border-border/50 p-3">
                  <div className="flex-1 space-y-2">
                    <Input
                      value={item.title ?? ""}
                      onChange={(e) => updateItem(idx, { title: e.target.value })}
                      placeholder="Value Title (e.g. WhatsApp-Native Commerce)"
                      className="h-8 text-xs font-medium"
                    />
                    <Textarea
                      value={item.body ?? ""}
                      onChange={(e) => updateItem(idx, { body: e.target.value })}
                      placeholder="Value description..."
                      rows={2}
                      className="text-xs"
                    />
                  </div>
                  <Button size="icon" variant="ghost" className="text-destructive h-8 w-8" onClick={() => removeItem(idx)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
