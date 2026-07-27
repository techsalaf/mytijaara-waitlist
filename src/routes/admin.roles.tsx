import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Shield } from "lucide-react";
import { roles } from "@/lib/mock-data";

export const Route = createFileRoute("/admin/roles")({
  head: () => ({ meta: [{ title: "Roles & Permissions — MyTijaara Admin" }, { name: "robots", content: "noindex" }] }),
  component: RolesPage,
});

function RolesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & Permissions"
        description="Control what each team member can access and do."
        actions={<Button asChild size="sm" className="bg-primary hover:bg-primary/90"><Link to="/admin/roles/$id" params={{ id: "new" }}><Plus className="mr-2 h-4 w-4" /> Create role</Link></Button>}
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {roles.map((r) => (
          <Link key={r.id} to="/admin/roles/$id" params={{ id: r.id }} className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between">
              <div className="grid h-10 w-10 place-items-center rounded-xl text-white" style={{ background: r.color }}>
                <Shield className="h-5 w-5" />
              </div>
              <Badge variant="secondary" className="text-xs"><Users className="mr-1 h-3 w-3" /> {r.users}</Badge>
            </div>
            <div className="mt-3 text-base font-semibold">{r.name}</div>
            <div className="mt-1 text-xs text-muted-foreground">{r.description}</div>
            <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3 text-xs">
              <span className="text-muted-foreground">Permissions</span>
              <span className="font-semibold">{r.permissions}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
