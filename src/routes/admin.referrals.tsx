import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import { Download, Award } from "lucide-react";

export const Route = createFileRoute("/admin/referrals")({
  head: () => ({ meta: [{ title: "Referrals — MyTijaara Admin" }, { name: "robots", content: "noindex" }] }),
  component: ReferralsLayout,
});

const tabs = [
  { to: "/admin/referrals", label: "Overview", exact: true },
  { to: "/admin/referrals/leaderboard", label: "Leaderboard" },
  { to: "/admin/referrals/analytics", label: "Analytics" },
];

function ReferralsLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="space-y-6">
      <PageHeader
        title="Referral Program"
        description="Track referrals, reward top performers, and measure viral growth."
        actions={
          <>
            <Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4" /> Export</Button>
            <Button size="sm" className="bg-primary hover:bg-primary/90"><Award className="mr-2 h-4 w-4" /> Send rewards</Button>
          </>
        }
      />
      <div className="flex gap-1 border-b border-border/60">
        {tabs.map((t) => {
          const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
          return (
            <Link key={t.to} to={t.to} className={cn(
              "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}>{t.label}</Link>
          );
        })}
      </div>
      <Outlet />
    </div>
  );
}
