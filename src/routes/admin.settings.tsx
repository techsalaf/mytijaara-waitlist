import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { PageHeader } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "Settings — MyTijaara Admin" }, { name: "robots", content: "noindex" }] }),
  component: SettingsLayout,
});

const nav = [
  { to: "/admin/settings", label: "General", exact: true },
  { to: "/admin/settings/branding", label: "Branding" },
  { to: "/admin/settings/company", label: "Company" },
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
      <PageHeader
        title="Settings"
        description="Configure your workspace, branding, integrations and more."
        actions={<Button size="sm" className="bg-primary hover:bg-primary/90" onClick={() => toast.success("Saved")}><Save className="mr-2 h-4 w-4" /> Save changes</Button>}
      />
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-0.5">
          {nav.map((t) => {
            const active = t.exact ? pathname === t.to : pathname === t.to;
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
