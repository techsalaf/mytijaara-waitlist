/**
 * `/admin/data-room` — the founder's side of the investor data room.
 *
 * Every tab under here calls endpoints behind `auth:sanctum` plus a per-endpoint
 * `data-room.*` permission. The `admin` role is deliberately withheld
 * `data-room.manage-settings` and `data-room.delete`, so a 403 on the Settings tab
 * is the design working, not a bug.
 *
 * This layout is the only route in the app that links to data room administration.
 * The visitor side at `/dataroom` is not linked from anywhere, including from here:
 * it is reached by a URL the visitor is given, and the URL alone admits nobody.
 */

import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { PageHeader } from "@/components/admin/ui-bits";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/data-room")({
  head: () => ({
    meta: [
      { title: "Data Room — MyTijaara Admin" },
      { name: "robots", content: "noindex, nofollow, noarchive" },
    ],
  }),
  component: DataRoomAdminLayout,
});

const tabs = [
  { to: "/admin/data-room", label: "Overview", exact: true },
  { to: "/admin/data-room/documents", label: "Documents" },
  { to: "/admin/data-room/grants", label: "Access grants" },
  { to: "/admin/data-room/matrix", label: "Permission matrix" },
  { to: "/admin/data-room/activity", label: "Activity" },
  { to: "/admin/data-room/settings", label: "Settings" },
];

function DataRoomAdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="space-y-6">
      <PageHeader
        title="Investor Data Room"
        description="Issue access, publish diligence documents, and read who opened what. Visitors reach the room at /dataroom with an email address and a code you give them."
      />
      <div className="flex flex-wrap gap-1 border-b border-border/60">
        {tabs.map((t) => {
          const active = t.exact
            ? pathname === t.to || pathname === `${t.to}/`
            : pathname === t.to || pathname.startsWith(`${t.to}/`);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
      <Outlet />
    </div>
  );
}
