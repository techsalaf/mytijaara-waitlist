import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { PageHeader } from "@/components/admin/ui-bits";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/cms")({
  head: () => ({ meta: [{ title: "CMS — MyTijaara Admin" }, { name: "robots", content: "noindex" }] }),
  component: CmsLayout,
});

/**
 * One tab per CMS section. Each tab saves its own section, so there is no
 * layout-level Save button: a shared one could not know which section is dirty.
 */
const tabs = [
  { to: "/admin/cms", label: "Hero", exact: true },
  { to: "/admin/cms/launch", label: "Launch" },
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
      {/*
        "Preview site" used to live here. It now sits in the admin topbar next to
        the notification bell, so it is reachable from every admin page instead
        of only this one.
      */}
      <PageHeader
        title="Content Management"
        description="Edit every section of your landing page and marketing site. Save content in each section individually."
      />
      <div className="flex flex-wrap gap-1 border-b border-border/60">
        {tabs.map((t) => {
          const active = t.exact
            ? pathname === t.to || pathname === `${t.to}/`
            : pathname === t.to || pathname.startsWith(`${t.to}/`);
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
