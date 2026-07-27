import { createFileRoute } from "@tanstack/react-router";
import { SectionCard, EmptyState } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { GripVertical, Plus, Trash2, UtensilsCrossed, ShoppingBasket, Pill, Wrench, Car, Package, Store } from "lucide-react";

export const Route = createFileRoute("/admin/cms/features")({
  component: FeaturesEditor,
});

const features = [
  { icon: UtensilsCrossed, title: "Food delivery", desc: "Order from your favorite restaurants" },
  { icon: ShoppingBasket, title: "Groceries", desc: "Fresh produce delivered fast" },
  { icon: Pill, title: "Pharmacy", desc: "Meds and health items on demand" },
  { icon: Wrench, title: "Artisans", desc: "Book plumbers, electricians and more" },
  { icon: Package, title: "Send parcels", desc: "Same-day delivery across your city" },
  { icon: Car, title: "Car rentals", desc: "Rent by hour, day or week" },
  { icon: Store, title: "Shop businesses", desc: "Buy from local shops and vendors" },
];

function FeaturesEditor() {
  return (
    <div className="space-y-4">
      <SectionCard
        title="Features grid"
        description="Reorder, edit or add features shown on the landing page"
        actions={<Button size="sm" className="bg-primary hover:bg-primary/90"><Plus className="mr-2 h-4 w-4" /> Add feature</Button>}
      >
        <div className="space-y-2">
          {features.map((f, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl border border-border/60 p-3">
              <button className="mt-1 cursor-grab text-muted-foreground"><GripVertical className="h-4 w-4" /></button>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <div className="grid flex-1 gap-2 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Title</Label>
                  <Input defaultValue={f.title} className="mt-1 h-8" />
                </div>
                <div>
                  <Label className="text-xs">Description</Label>
                  <Input defaultValue={f.desc} className="mt-1 h-8" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch defaultChecked />
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
