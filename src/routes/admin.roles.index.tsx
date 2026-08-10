import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Shield, Users } from "lucide-react";
import { rolesApi, type Role } from "@/lib/api";

export const Route = createFileRoute("/admin/roles/")({
  head: () => ({
    meta: [
      { title: "Roles & Permissions — MyTijaara Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RolesIndexPage,
});

function RolesIndexPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await rolesApi.list();
      setRoles(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load roles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & Permissions"
        description="Control what each team member can access and do."
        actions={
          <Button asChild size="sm" className="bg-primary hover:bg-primary/90">
            <Link to="/admin/roles/$id" params={{ id: "new" }}>
              <Plus className="mr-2 h-4 w-4" /> Create role
            </Link>
          </Button>
        }
      />

      {loading && (
        <div className="grid min-h-[30vh] place-items-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}

      {!loading && error && (
        <div className="space-y-3 rounded-2xl border border-border/60 bg-card p-6">
          <p className="text-sm text-destructive">{error}</p>
          <Button size="sm" variant="outline" onClick={() => void load()}>
            Try again
          </Button>
        </div>
      )}

      {!loading && !error && roles.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
          No roles yet. Create the first one to start assigning permissions.
        </div>
      )}

      {!loading && !error && roles.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {roles.map((r) => (
            <Link
              key={r.id}
              to="/admin/roles/$id"
              params={{ id: r.id }}
              className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div
                  className="grid h-10 w-10 place-items-center rounded-xl text-primary-foreground"
                  style={{ background: r.color }}
                >
                  <Shield className="h-5 w-5" />
                </div>
                <Badge variant="secondary" className="text-xs">
                  <Users className="mr-1 h-3 w-3" /> {r.users}
                </Badge>
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
      )}
    </div>
  );
}
