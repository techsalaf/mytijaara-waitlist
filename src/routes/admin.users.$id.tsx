import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SectionCard } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Circle, Loader2, Save, Send, Trash2 } from "lucide-react";
import { rolesApi, usersApi, type Role } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/users/$id")({
  loader: async ({ params }) => {
    const response = await usersApi.get(params.id);
    if (!response.data) throw notFound();
    return response.data;
  },
  head: () => ({
    meta: [{ title: "Team member — MyTijaara Admin" }, { name: "robots", content: "noindex" }],
  }),
  notFoundComponent: () => (
    <div className="p-10 text-center">
      User not found.{" "}
      <Link to="/admin/users" className="text-primary">
        Go back
      </Link>
    </div>
  ),
  component: UserDetail,
});

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function UserDetail() {
  const loaded = Route.useLoaderData();
  const navigate = useNavigate();
  const { id } = Route.useParams();

  const [name, setName] = useState(loaded.name);
  const [email, setEmail] = useState(loaded.email);
  const [phone, setPhone] = useState(loaded.phone ?? "");
  const [status, setStatus] = useState(loaded.status);
  const [role, setRole] = useState(loaded.role);
  const [roles, setRoles] = useState<Role[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void rolesApi
      .list()
      .then((response) => setRoles(response.data))
      .catch(() => {
        /* keep the current role as the only option */
      });
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await usersApi.update(id, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        status: status as "active" | "invited",
        role,
      });
      toast.success("Member updated");
      await navigate({ to: "/admin/users/$id", params: { id }, replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save this member");
    } finally {
      setSaving(false);
    }
  };

  const resend = async () => {
    try {
      const response = await usersApi.resendInvite(id);
      if (response.data.sent) toast.success(response.data.message);
      else toast.error(response.data.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not re-send the invitation");
    }
  };

  const remove = async () => {
    setSaving(true);
    try {
      await usersApi.remove(id);
      toast.success("Member removed");
      await navigate({ to: "/admin/users" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove this member");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/admin/users">
          <ArrowLeft className="mr-1 h-3 w-3" /> Back to users
        </Link>
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground">
            {loaded.avatar}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{loaded.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>{loaded.email}</span>
              <Badge variant="secondary">{loaded.role}</Badge>
              <Badge
                className={
                  loaded.status === "active"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-gold/15 text-gold-foreground"
                }
              >
                {loaded.status}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {loaded.status === "invited" && (
            <Button size="sm" variant="outline" onClick={() => void resend()}>
              <Send className="mr-2 h-4 w-4" /> Resend invite
            </Button>
          )}
          <Button size="sm" variant="outline" disabled={saving} onClick={() => void remove()}>
            <Trash2 className="mr-2 h-4 w-4" /> Remove
          </Button>
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90"
            disabled={saving}
            onClick={() => void save()}
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Profile" className="lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="user-name">Full name</Label>
              <Input
                id="user-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="user-phone">Phone</Label>
              <Input
                id="user-phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Not set"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">active</SelectItem>
                  <SelectItem value="invited">invited</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(roles.length > 0
                    ? roles.map((r) => r.name)
                    : [loaded.role].filter(Boolean)
                  ).map((label) => (
                    <SelectItem key={label} value={label}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Timezone</Label>
              <Input value={loaded.timezone ?? "—"} readOnly className="mt-1.5 bg-muted/40" />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Access">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between rounded-lg bg-muted/40 p-2">
              <span className="text-muted-foreground">Role key</span>
              <span className="font-semibold">{loaded.roleSlug || "—"}</span>
            </div>
            <div className="flex justify-between rounded-lg bg-muted/40 p-2">
              <span className="text-muted-foreground">Permissions</span>
              <span className="font-semibold">{loaded.permissions.length}</span>
            </div>
            <div className="flex justify-between rounded-lg bg-muted/40 p-2">
              <span className="text-muted-foreground">Email verified</span>
              <span
                className={`font-semibold ${
                  loaded.emailVerified ? "text-emerald-600" : "text-muted-foreground"
                }`}
              >
                {loaded.emailVerified ? "Yes" : "No"}
              </span>
            </div>
            <div className="flex justify-between rounded-lg bg-muted/40 p-2">
              <span className="text-muted-foreground">Joined</span>
              <span className="font-semibold">{formatDate(loaded.createdAt)}</span>
            </div>
            <div className="flex justify-between rounded-lg bg-muted/40 p-2">
              <span className="text-muted-foreground">Last active</span>
              <span className="font-semibold">{formatDate(loaded.lastActiveAt)}</span>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Activity timeline"
        description="Audit rows written by this account, most recent first."
      >
        {loaded.recentActivity.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No recorded activity for this account yet.
          </p>
        ) : (
          <ol className="relative space-y-4 border-l-2 border-border/60 pl-6">
            {loaded.recentActivity.map((entry) => (
              <li key={entry.id} className="relative">
                <span className="absolute -left-[30px] top-1 grid h-4 w-4 place-items-center rounded-full border-2 border-primary bg-card">
                  <Circle className="h-1.5 w-1.5 fill-primary text-primary" />
                </span>
                <div className="text-sm">
                  {entry.action}
                  {entry.target ? <span className="text-muted-foreground"> · {entry.target}</span> : null}
                </div>
                <div className="text-xs text-muted-foreground">
                  {entry.time} · {entry.ip}
                </div>
              </li>
            ))}
          </ol>
        )}
      </SectionCard>
    </div>
  );
}
