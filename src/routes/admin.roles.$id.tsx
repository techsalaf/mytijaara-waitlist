import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { SectionCard } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Loader2, Save, Trash2 } from "lucide-react";
import { rolesApi, type PermissionGroup, type RoleDetail } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/roles/$id")({
  head: () => ({
    meta: [{ title: "Role — MyTijaara Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: RoleDetailPage,
});

const COLORS = ["#004A28", "#166534", "#D4A017", "#0891b2", "#7c3aed", "#64748b"];

function RoleDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const isNew = id === "new";

  const [role, setRole] = useState<RoleDetail | null>(null);
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [granted, setGranted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const groups = await rolesApi.permissions();
      setPermissionGroups(groups.data);
      if (!isNew) {
        const detail = await rolesApi.get(id);
        setRole(detail.data);
        setName(detail.data.name);
        setDescription(detail.data.description ?? "");
        setColor(detail.data.color || COLORS[0]);
        setGranted(new Set(detail.data.grantedPermissions ?? []));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load this role");
    } finally {
      setLoading(false);
    }
  }, [id, isNew]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = (key: string, on: boolean) =>
    setGranted((current) => {
      const next = new Set(current);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });

  const toggleGroup = (group: PermissionGroup, on: boolean) =>
    setGranted((current) => {
      const next = new Set(current);
      for (const permission of group.permissions) {
        if (on) next.add(permission.key);
        else next.delete(permission.key);
      }
      return next;
    });

  const save = async () => {
    if (!name.trim()) {
      toast.error("Role name is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        color,
        permissions: [...granted],
      };
      if (isNew) {
        const created = await rolesApi.create(payload);
        toast.success("Role created");
        // Leave "new" behind so a second save patches instead of creating a twin.
        await navigate({ to: "/admin/roles/$id", params: { id: created.data.id } });
      } else {
        const saved = await rolesApi.update(id, payload);
        setRole(saved.data);
        toast.success("Role saved");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save role");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!role) return;
    setSaving(true);
    try {
      await rolesApi.remove(id);
      toast.success("Role deleted");
      await navigate({ to: "/admin/roles" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete role");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-[40vh] place-items-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">{error}</p>
        <Button size="sm" variant="outline" onClick={() => void load()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/admin/roles">
          <ArrowLeft className="mr-1 h-3 w-3" /> Back to roles
        </Link>
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">
          {isNew ? "Create role" : `Edit: ${role?.name ?? "Role"}`}
        </h1>
        <div className="flex items-center gap-2">
          {!isNew && (
            <Button
              size="sm"
              variant="outline"
              disabled={saving || !!role?.builtIn}
              title={role?.builtIn ? "Built-in roles cannot be deleted" : undefined}
              onClick={() => void remove()}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          )}
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

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <SectionCard title="Details">
          <div className="space-y-4">
            <div>
              <Label htmlFor="role-name">Role name</Label>
              <Input
                id="role-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Content Editor"
                className="mt-1.5"
              />
              {!isNew && role && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Permission key: <code>{role.slug}</code> (fixed — API gates reference it)
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="role-description">Description</Label>
              <Textarea
                id="role-description"
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Badge color</Label>
              <div className="mt-1.5 flex gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Use colour ${c}`}
                    aria-pressed={color === c}
                    onClick={() => setColor(c)}
                    className={`h-8 w-8 rounded-lg border-2 ${
                      color === c ? "border-foreground" : "border-transparent hover:border-black/20"
                    }`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Permissions"
          description="Assign what this role can do across the platform"
        >
          <div className="space-y-4">
            {permissionGroups.map((g) => {
              const all = g.permissions.every((permission) => granted.has(permission.key));
              return (
                <div key={g.group} className="rounded-xl border border-border/60 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm font-semibold">{g.label}</div>
                    <label className="flex items-center gap-2 text-xs">
                      <Checkbox
                        checked={all}
                        onCheckedChange={(checked) => toggleGroup(g, checked === true)}
                      />
                      Select all
                    </label>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {g.permissions.map((permission) => (
                      <label
                        key={permission.key}
                        className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm"
                      >
                        <Checkbox
                          checked={granted.has(permission.key)}
                          onCheckedChange={(checked) => toggle(permission.key, checked === true)}
                        />
                        <span>{permission.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
