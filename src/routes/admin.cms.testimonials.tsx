import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SectionCard } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Star, Plus, Trash2 } from "lucide-react";
import { cmsApi, type Testimonial } from "@/lib/api";

export const Route = createFileRoute("/admin/cms/testimonials")({
  component: Testimonials,
});

function Testimonials() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const refresh = async () => setTestimonials((await cmsApi.testimonials()).data);
  useEffect(() => {
    void refresh();
  }, []);
  const update = async (id: number, patch: Partial<Testimonial>) => {
    await cmsApi.updateTestimonial(id, patch);
    await refresh();
  };
  const add = async () => {
    await cmsApi.createTestimonial({
      name: "New customer",
      role: "Community member",
      quote: "Add a testimonial.",
      rating: 5,
      published: false,
    });
    await refresh();
  };
  const remove = async (id: number) => {
    await cmsApi.removeTestimonial(id);
    await refresh();
  };
  return (
    <SectionCard
      title="Testimonials"
      description="Manage social proof shown on the landing page"
      actions={
        <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={() => void add()}>
          <Plus className="mr-2 h-4 w-4" /> Add testimonial
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        {testimonials.map((t) => (
          <div key={t.id} className="rounded-xl border border-border/60 p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {t.avatar}
                </div>
                <div>
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-gold text-gold" />
                ))}
              </div>
            </div>
            <Textarea
              rows={3}
              defaultValue={t.quote}
              onBlur={(event) => void update(t.id, { quote: event.target.value })}
              className="mt-3"
            />
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={t.published}
                  id={`p-${t.id}`}
                  onCheckedChange={(published) => void update(t.id, { published })}
                />
                <Label htmlFor={`p-${t.id}`} className="text-xs">
                  Published
                </Label>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-500"
                onClick={() => void remove(t.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
