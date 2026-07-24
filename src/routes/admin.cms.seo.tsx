import { createFileRoute } from "@tanstack/react-router";
import { SectionCard } from "@/components/admin/ui-bits";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin/cms/seo")({
  component: () => (
    <div className="grid gap-4 lg:grid-cols-2">
      <SectionCard title="Search engine optimization">
        <div className="space-y-4">
          <div><Label>Title (max 60)</Label><Input defaultValue="MyTijaara — Everything you need, all in one place" className="mt-1.5" /></div>
          <div><Label>Meta description (max 160)</Label><Textarea rows={3} defaultValue="Order food, groceries and pharmacy items, book trusted artisans, send packages, rent cars and shop from businesses around you — all from one app built for Nigerians." className="mt-1.5" /></div>
          <div><Label>Canonical URL</Label><Input defaultValue="https://mytijaara.com" className="mt-1.5" /></div>
          <div><Label>Keywords</Label><Input defaultValue="nigeria super app, food delivery, groceries, artisans, parcel" className="mt-1.5" /></div>
        </div>
      </SectionCard>
      <SectionCard title="Open Graph & Twitter">
        <div className="space-y-4">
          <div><Label>OG Title</Label><Input defaultValue="MyTijaara — Everything you need, all in one place" className="mt-1.5" /></div>
          <div><Label>OG Description</Label><Textarea rows={3} defaultValue="Built for Nigerians. One app for food, groceries, artisans and more." className="mt-1.5" /></div>
          <div><Label>OG Image URL</Label><Input defaultValue="https://mytijaara.com/og.png" className="mt-1.5" /></div>
          <div><Label>Twitter handle</Label><Input defaultValue="@mytijaara" className="mt-1.5" /></div>
        </div>
      </SectionCard>
    </div>
  ),
});
