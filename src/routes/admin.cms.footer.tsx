import { createFileRoute } from "@tanstack/react-router";
import { SectionCard } from "@/components/admin/ui-bits";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

const cols = [
  { title: "Product", items: ["Features", "For vendors", "For riders", "Pricing"] },
  { title: "Company", items: ["About", "Careers", "Press"] },
  { title: "Support", items: ["Help center", "Contact", "Terms", "Privacy"] },
];

export const Route = createFileRoute("/admin/cms/footer")({
  component: () => (
    <div className="grid gap-4 lg:grid-cols-2">
      <SectionCard title="Footer content">
        <div className="space-y-4">
          <div>
            <Label>Tagline</Label>
            <Textarea rows={2} defaultValue="Everything Nigerians need, in one app." className="mt-1.5" />
          </div>
          <div>
            <Label>Copyright</Label>
            <Input defaultValue="© 2026 MyTijaara Technologies Ltd." className="mt-1.5" />
          </div>
          <div>
            <Label>Contact email</Label>
            <Input defaultValue="hello@mytijaara.com" className="mt-1.5" />
          </div>
          <div>
            <Label>Support phone</Label>
            <Input defaultValue="+234 800 123 4567" className="mt-1.5" />
          </div>
        </div>
      </SectionCard>
      <SectionCard title="Link columns" actions={<Button size="sm" variant="outline"><Plus className="mr-2 h-4 w-4" /> Column</Button>}>
        <div className="space-y-4">
          {cols.map((c, ci) => (
            <div key={ci} className="rounded-xl border border-border/60 p-3">
              <Input defaultValue={c.title} className="mb-2 font-semibold" />
              <div className="space-y-1.5">
                {c.items.map((it, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input defaultValue={it} className="h-8" />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button variant="ghost" size="sm" className="w-full"><Plus className="mr-1 h-3 w-3" /> Add link</Button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  ),
});
