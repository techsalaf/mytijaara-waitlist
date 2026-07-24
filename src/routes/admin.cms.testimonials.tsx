import { createFileRoute } from "@tanstack/react-router";
import { SectionCard } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Star, Plus, Trash2 } from "lucide-react";
import { testimonials } from "@/lib/mock-data";

export const Route = createFileRoute("/admin/cms/testimonials")({
  component: () => (
    <SectionCard
      title="Testimonials"
      description="Manage social proof shown on the landing page"
      actions={<Button size="sm" className="bg-[#0D7A46] hover:bg-[#166534]"><Plus className="mr-2 h-4 w-4" /> Add testimonial</Button>}
    >
      <div className="grid gap-4 md:grid-cols-2">
        {testimonials.map((t) => (
          <div key={t.id} className="rounded-xl border border-border/60 p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-[#0D7A46]/10 text-sm font-bold text-[#0D7A46]">{t.avatar}</div>
                <div>
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {Array.from({ length: t.rating }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-[#D4A017] text-[#D4A017]" />)}
              </div>
            </div>
            <Textarea rows={3} defaultValue={t.quote} className="mt-3" />
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch defaultChecked={t.published} id={`p-${t.id}`} />
                <Label htmlFor={`p-${t.id}`} className="text-xs">Published</Label>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500"><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  ),
});
