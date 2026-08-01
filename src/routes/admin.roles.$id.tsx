import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SectionCard } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save } from "lucide-react";
import { rolesApi, type PermissionGroup, type Role } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/roles/$id")({
  component: RoleDetail,
});

function RoleDetail() {
  const { id } = Route.useParams();
  const [role, setRole] = useState<(Role & { grantedPermissions?: string[] }) | null>(null);
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>([]);
  const [name, setName] = useState("");
  const [granted, setGranted] = useState<Set<string>>(new Set());
  const isNew = id === "new";
  useEffect(() => {
    void rolesApi.permissions().then((response) => setPermissionGroups(response.data));
    if (!isNew)
      void rolesApi.get(id).then((response) => {
        setRole(response.data);
        setName(response.data.name);
        setGranted(new Set(response.data.grantedPermissions ?? []));
      });
  }, [id, isNew]);
  const save = async () => {
    try {
      if (isNew) await rolesApi.create({ name, permissions: [...granted] });
      else await rolesApi.update(id, { name, permissions: [...granted] });
      toast.success("Role saved");
    } catch {
      toast.error("Could not save role");
    }
  };

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/admin/roles">
          <ArrowLeft className="mr-1 h-3 w-3" /> Back to roles
        </Link>
      </Button>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {isNew ? "Create role" : `Edit: ${role?.name ?? "Role"}`}
        </h1>
        <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={() => void save()}>
          <Save className="mr-2 h-4 w-4" /> Save
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <SectionCard title="Details">
          <div className="space-y-4">
            <div>
              <Label>Role name</Label>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Content Editor"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea rows={3} defaultValue={role?.description ?? ""} className="mt-1.5" />
            </div>
            <div>
              <Label>Badge color</Label>
              <div className="mt-1.5 flex gap-2">
                {["#0D7A46", "#166534", "#D4A017", "#0891b2", "#7c3aed", "#64748b"].map((c) => (
                  <button
                    key={c}
                    className="h-8 w-8 rounded-lg border-2 border-transparent hover:border-black/20"
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
            {permissionGroups.map((g) => (
              <div key={g.group} className="rounded-xl border border-border/60 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="font-semibold text-sm">{g.group}</div>
                  <label className="flex items-center gap-2 text-xs">
                    <Checkbox defaultChecked /> Select all
                  </label>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {(g.items ?? g.permissions?.map((permission) => permission.key) ?? []).map(
                    (it) => (
                      <label
                        key={it}
                        className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm"
                      >
                        <Checkbox
                          checked={granted.has(it)}
                          onCheckedChange={(checked) =>
                            setGranted((current) => {
                              const next = new Set(current);
                              checked ? next.add(it) : next.delete(it);
                              return next;
                            })
                          }
                        />
                        <span className="capitalize">{it.replace(/-/g, " ")}</span>
                      </label>
                    ),
                  )}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
