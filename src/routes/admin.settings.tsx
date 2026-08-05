import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { PageHeader } from "@/components/admin/ui-bits";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "Settings — MyTijaara Admin" }, { name: "robots", content: "noindex" }] }),
  component: SettingsLayout,
});

/**
 * One tab per settings group on the backend. There is deliberately no second
 * tab writing a group another tab already owns: two forms merging into the same
 * row would each silently revert the other's fields.
 */
const nav = [
  { to: "/admin/settings", label: "General" },
  { to: "/admin/settings/branding", label: "Branding" },
  { to: "/admin/settings/smtp", label: "SMTP / Email" },
  { to: "/admin/settings/integrations", label: "Analytics & Tracking" },
  { to: "/admin/settings/social", label: "Social" },
  { to: "/admin/settings/seo", label: "SEO defaults" },
  { to: "/admin/settings/api-keys", label: "API Keys" },
  { to: "/admin/settings/system", label: "System" },
];

function SettingsLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="space-y-6">
      {/*
        No Save button here. Each tab owns its own save because each tab writes a
        different settings group; a shared button could only ever fake it.
      */}
      <PageHeader
        title="Settings"
        description="Configure your workspace, branding, integrations and more."
      />
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-0.5">
          {nav.map((t) => {
            const active = pathname === t.to || pathname === `${t.to}/`;
            return (
              <Link key={t.to} to={t.to} className={cn(
                "block rounded-lg px-3 py-2 text-sm font-medium",
                active ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-muted"
              )}>{t.label}</Link>
            );
          })}
        </aside>
        <div><Outlet /></div>
      </div>
    </div>
  );
}
