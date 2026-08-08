import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { PageHeader, SectionCard } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Search, Send } from "lucide-react";
import { rolesApi, usersApi, type AdminUser, type Role } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [{ title: "Users — MyTijaara Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: UsersPage,
});

const STATUSES = ["all", "active", "invited"] as const;

function UsersPage() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState<string>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("");
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Filters are sent to the API so the row set and the total agree.
      const response = await usersApi.list({
        search: search.trim() || undefined,
        role: role === "all" ? undefined : role,
        status: status === "all" ? undefined : status,
        from: from || undefined,
        to: to || undefined,
        per_page: 100,
      });
      setUsers(response.data);
      setTotal(
        typeof response.meta?.total === "number" ? response.meta.total : response.data.length,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load team members");
    } finally {
      setLoading(false);
    }
  }, [search, role, status, from, to]);

  useEffect(() => {
    // Debounced so typing in the search box does not fire a request per keypress.
    const timer = setTimeout(() => void load(), 250);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    void rolesApi
      .list()
      .then((response) => {
        setRoles(response.data);
        setInviteRole((current) => current || response.data[0]?.name || "");
      })
      .catch(() => {
        /* the role filter degrades to "All roles" */
      });
  }, []);

  const invite = async () => {
    if (!inviteName.trim() || !inviteEmail.trim() || !inviteRole) {
      toast.error("Name, email and role are all required");
      return;
    }
    setInviting(true);
    try {
      const response = await usersApi.create({
        name: inviteName.trim(),
        email: inviteEmail.trim(),
        role: inviteRole,
        status: "invited",
        invite: true,
      });
      const sent = response.meta?.invited === true;
      const message =
        typeof response.meta?.message === "string" ? response.meta.message : undefined;
      if (sent) toast.success(message ?? "Invitation sent");
      else toast.warning(message ?? "User created, but the invitation email did not send");
      setInviteOpen(false);
      setInviteName("");
      setInviteEmail("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not invite this member");
    } finally {
      setInviting(false);
    }
  };

  const resend = async (id: string) => {
    try {
      const response = await usersApi.resendInvite(id);
      if (response.data.sent) toast.success(response.data.message);
      else toast.error(response.data.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not re-send the invitation");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team members"
        description="Admins, editors and support staff with access to this panel."
        actions={
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90"
            onClick={() => setInviteOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" /> Invite member
          </Button>
        }
      />
      <SectionCard>
        <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative lg:col-span-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name or email…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger>
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {roles.map((r) => (
                <SelectItem key={r.id} value={r.name}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "all" ? "All statuses" : s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            aria-label="Joined from"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </div>
        <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            type="date"
            aria-label="Joined to"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="lg:col-start-4"
          />
        </div>

        {loading && (
          <div className="grid min-h-[20vh] place-items-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}

        {!loading && error && (
          <div className="space-y-3 py-6 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button size="sm" variant="outline" onClick={() => void load()}>
              Try again
            </Button>
          </div>
        )}

        {!loading && !error && users.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No team members match these filters.
          </p>
        )}

        {!loading && !error && users.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="pb-2 font-medium">Member</th>
                    <th className="pb-2 font-medium">Role</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Last active</th>
                    <th className="pb-2 text-right font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
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
                      <td className="py-3 text-xs text-muted-foreground">{u.lastActive}</td>
                      <td className="py-3 text-right">
                        {u.status === "invited" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void resend(u.id)}
                            title="Re-send the invitation email"
                          >
                            <Send className="mr-1 h-3 w-3" /> Resend
                          </Button>
                        )}
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
            <p className="mt-3 text-xs text-muted-foreground">
              Showing {users.length} of {total} member{total === 1 ? "" : "s"}
            </p>
          </>
        )}
      </SectionCard>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite a team member</DialogTitle>
            <DialogDescription>
              They receive an email with a link to set their own password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="invite-name">Full name</Label>
              <Input
                id="invite-name"
                value={inviteName}
                onChange={(event) => setInviteName(event.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Pick a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.name}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)} disabled={inviting}>
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90"
              onClick={() => void invite()}
              disabled={inviting || roles.length === 0}
              title={roles.length === 0 ? "No roles available to assign" : undefined}
            >
              {inviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
