import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Filter } from "lucide-react";
import { useEffect, useState } from "react";
import { usersApi, type AdminUserRow } from "@/lib/api";

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [{ title: "Users — MyTijaara Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: UsersPage,
});

function UsersPage() {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  useEffect(() => {
    void usersApi.list().then((response) => setUsers(response.data));
  }, []);
  const filtered = users.filter((u) =>
    (u.name + u.email + u.role).toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <div className="space-y-6">
      <PageHeader
        title="Team members"
        description="Admins, editors and support staff with access to this panel."
        actions={
          <Button size="sm" className="bg-primary hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" /> Invite member
          </Button>
        }
      />
      <SectionCard>
        <div className="mb-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search team…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" /> Filters
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="pb-2 font-medium">Member</th>
                <th className="pb-2 font-medium">Role</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Last active</th>
                <th className="pb-2 font-medium text-right"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-t border-border/40">
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {u.avatar}
                      </div>
                      <div>
                        <div className="font-medium">{u.name}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3">
                    <Badge variant="secondary">{u.role}</Badge>
                  </td>
                  <td className="py-3">
                    <Badge
                      className={
                        u.status === "active"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-gold/15 text-gold-foreground"
                      }
                    >
                      {u.status}
                    </Badge>
                  </td>
                  <td className="py-3 text-muted-foreground text-xs">{u.lastActive}</td>
                  <td className="py-3 text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/admin/users/$id" params={{ id: u.id }}>
                        View
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
