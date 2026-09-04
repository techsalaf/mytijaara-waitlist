import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { SectionCard } from "@/components/admin/ui-bits";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { GripVertical, Plus, Trash2, Loader2, Save } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useCmsSection } from "@/lib/hooks/useCmsSection";

type FooterColumn = {
  title?: string;
  links?: { label?: string; href?: string }[];
};

/**
 * The footer's contact info (email, phone, social links) comes from
 * `branding` (Settings → Branding / Social), not from this section.
 * `contactEmail` and `supportPhone` used to be stored here too but were never
 * read by the footer component, so they are removed.
 *
 * `copyright` is the bottom-bar legal line. It is a template: `{year}` is
 * replaced with the current year and `{heart}` with the heart icon, which is how
 * the line stays editable without losing the brand mark.
 */
type FooterData = {
  tagline?: string;
  copyright?: string;
  columns?: FooterColumn[];
};

const defaultFooterData: FooterData = {
  tagline: "",
  copyright: "",
  columns: [],
};

export const Route = createFileRoute("/admin/cms/footer")({
  component: FooterEditor,
});

function FooterEditor() {
  const { data, setData, enabled, setEnabled, loading, saving, save } = useCmsSection<FooterData>(
    "footer",
    defaultFooterData,
  );

  const columns = useMemo(() => data.columns ?? [], [data.columns]);

  const updateColumn = (index: number, patch: Partial<FooterColumn>) =>
    setData({
      ...data,
      columns: columns.map((column, i) => (i === index ? { ...column, ...patch } : column)),
    });

  const addColumn = () => setData({ ...data, columns: [...columns, { title: "", links: [] }] });

  const removeColumn = (index: number) => setData({ ...data, columns: columns.filter((_, i) => i !== index) });

  const updateLink = (colIndex: number, linkIndex: number, patch: Partial<{ label?: string; href?: string }>) => {
    setData({
      ...data,
      columns: columns.map((column, i) =>
        i === colIndex
          ? {
              ...column,
              links: (column.links ?? []).map((link, li) => (li === linkIndex ? { ...link, ...patch } : link)),
            }
          : column,
      ),
    });
  };

  const addLink = (colIndex: number) => {
    setData({
      ...data,
      columns: columns.map((column, i) =>
        i === colIndex
          ? { ...column, links: [...(column.links ?? []), { label: "", href: "" }] }
          : column,
      ),
    });
  };

  const removeLink = (colIndex: number, linkIndex: number) => {
    setData({
      ...data,
      columns: columns.map((column, i) =>
        i === colIndex
          ? { ...column, links: (column.links ?? []).filter((_, li) => li !== linkIndex) }
          : column,
      ),
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SectionCard
        title="Footer content"
        actions={
          <Button size="sm" onClick={save} disabled={loading || saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save changes
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
            <div>
              <div className="text-sm font-medium">Footer section enabled</div>
              <div className="text-xs text-muted-foreground">Toggle whether the footer is shown</div>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div>
            <Label>Tagline</Label>
            <Textarea
              rows={2}
              value={data.tagline ?? ""}
              onChange={(e) => setData({ ...data, tagline: e.target.value })}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Bottom bar / copyright line</Label>
            <Input
              value={data.copyright ?? ""}
              onChange={(e) => setData({ ...data, copyright: e.target.value })}
              placeholder="© {year} MyTijaara Ltd. Made with {heart} in Nigeria."
              className="mt-1.5"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              <code className="rounded bg-muted px-1">{"{year}"}</code> becomes the current year and{" "}
              <code className="rounded bg-muted px-1">{"{heart}"}</code> becomes the ♥ icon. Leave empty for the
              default line.
            </p>
          </div>
          <div className="rounded-lg border border-dashed border-border/60 p-3">
            <div className="text-sm font-medium">Contact details</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Email, phone and social links are edited in Settings → Branding and Settings → Social.
              They are shared with the announcement bar, the social widget, and the footer automatically.
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Link columns"
        actions={
          <Button size="sm" variant="outline" onClick={addColumn}>
            <Plus className="mr-2 h-4 w-4" /> Column
          </Button>
        }
      >
        <div className="space-y-4">
          {columns.map((column, colIndex) => (
            <div key={colIndex} className="rounded-xl border border-border/60 p-3">
              <Input
                value={column.title ?? ""}
                onChange={(e) => updateColumn(colIndex, { title: e.target.value })}
                className="mb-2 font-semibold"
              />
              <div className="space-y-1.5">
                {(column.links ?? []).map((link, linkIndex) => (
                  <div key={linkIndex} className="flex items-center gap-2">
                    <Input
                      value={link.label ?? ""}
                      onChange={(e) => updateLink(colIndex, linkIndex, { label: e.target.value })}
                      className="h-8"
                    />
                    <Input
                      value={link.href ?? ""}
                      onChange={(e) => updateLink(colIndex, linkIndex, { href: e.target.value })}
                      className="h-8"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500"
                      onClick={() => removeLink(colIndex, linkIndex)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="ghost" size="sm" className="w-full" onClick={() => addLink(colIndex)}>
                  <Plus className="mr-1 h-3 w-3" /> Add link
                </Button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
