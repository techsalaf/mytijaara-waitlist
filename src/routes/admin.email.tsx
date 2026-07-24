import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { PageHeader } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/email")({
  head: () => ({ meta: [{ title: "Email Marketing — MyTijaara Admin" }, { name: "robots", content: "noindex" }] }),
  component: EmailLayout,
});

const tabs = [
  { to: "/admin/email", label: "Campaigns", exact: true },
  { to: "/admin/email/scheduled", label: "Scheduled" },
  { to: "/admin/email/drafts", label: "Drafts" },
  { to: "/admin/email/templates", label: "Templates" },
];

function EmailLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="space-y-6">
      <PageHeader
        title="Email Marketing"
        description="Design, schedule and track email campaigns."
        actions={
          <Button asChild size="sm" className="bg-[#0D7A46] hover:bg-[#166534]">
            <Link to="/admin/email/builder"><Plus className="mr-2 h-4 w-4" /> New campaign</Link>
          </Button>
        }
      />
      <div className="flex flex-wrap gap-1 border-b border-border/60">
        {tabs.map((t) => {
          const active = t.exact ? pathname === t.to : pathname === t.to;
          return (
            <Link key={t.to} to={t.to} className={cn(
              "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              active ? "border-[#0D7A46] text-[#0D7A46]" : "border-transparent text-muted-foreground hover:text-foreground"
            )}>{t.label}</Link>
          );
        })}
      </div>
      <Outlet />
    </div>
  );
}
