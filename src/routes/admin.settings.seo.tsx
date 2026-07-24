import { createFileRoute } from "@tanstack/react-router";
import { SectionCard } from "@/components/admin/ui-bits";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/admin/settings/seo")({
  component: () => (
    <SectionCard title="SEO defaults" description="Applied when a page has no specific override">
      <div className="grid gap-4">
        <div><Label>Default title suffix</Label><Input defaultValue=" — MyTijaara" className="mt-1.5" /></div>
        <div><Label>Default description</Label><Textarea rows={3} defaultValue="Built for Nigerians. One app for food, groceries, artisans, parcels and more." className="mt-1.5" /></div>
        <div><Label>Sitemap URL</Label><Input defaultValue="https://mytijaara.com/sitemap.xml" className="mt-1.5" /></div>
        <div><Label>robots.txt</Label><Textarea rows={4} className="mt-1.5 font-mono text-xs" defaultValue={`User-agent: *\nAllow: /\nSitemap: https://mytijaara.com/sitemap.xml`} /></div>
      </div>
    </SectionCard>
  ),
});
