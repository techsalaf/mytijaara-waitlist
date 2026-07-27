import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { PageHeader } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Save, Eye } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/cms")({
  head: () => ({ meta: [{ title: "CMS — MyTijaara Admin" }, { name: "robots", content: "noindex" }] }),
  component: CmsLayout,
});

const tabs = [
  { to: "/admin/cms", label: "Hero", exact: true },
  { to: "/admin/cms/features", label: "Features" },
  { to: "/admin/cms/testimonials", label: "Testimonials" },
  { to: "/admin/cms/faqs", label: "FAQs" },
  { to: "/admin/cms/statistics", label: "Statistics" },
  { to: "/admin/cms/navigation", label: "Navigation" },
  { to: "/admin/cms/footer", label: "Footer" },
  { to: "/admin/cms/social", label: "Social" },
  { to: "/admin/cms/announcement", label: "Announcement" },
  { to: "/admin/cms/seo", label: "SEO" },
];

function CmsLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="space-y-6">
      <PageHeader
        title="Content Management"
        description="Edit every section of your landing page and marketing site."
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link to="/" target="_blank"><Eye className="mr-2 h-4 w-4" /> Preview site</Link>
            </Button>
            <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={() => toast.success("Published to production")}>
              <Save className="mr-2 h-4 w-4" /> Publish changes
            </Button>
          </>
        }
      />
      <div className="flex flex-wrap gap-1 border-b border-border/60">
        {tabs.map((t) => {
          const active = t.exact ? pathname === t.to : pathname === t.to;
          return (
            <Link key={t.to} to={t.to} className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}>{t.label}</Link>
          );
        })}
      </div>
      <Outlet />
    </div>
  );
}
