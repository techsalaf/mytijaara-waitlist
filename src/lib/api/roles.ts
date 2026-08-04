import { apiCall } from "./client";
import type { Role } from "@/lib/types";

export type PermissionGroup = {
  group: string;
  label?: string;
  permissions?: { key: string; label: string }[];
  items?: string[];
};

/**
 * Roles + permissions API.
 *
 *   GET    /roles          -> { data: Role[] }
 *   GET    /roles/:id      -> { data: Role & { grantedPermissions: string[] } }
 *   POST   /roles          -> { data: Role }
 *   PATCH  /roles/:id      -> { data: Role }
 *   DELETE /roles/:id      -> { data: { deleted } }
 *   GET    /permissions    -> { data: PermissionGroup[] }
 */
export const rolesApi = {
  list: () => apiCall<Role[]>("/roles", () => []),
  get: (id: string) =>
    apiCall<Role & { grantedPermissions: string[] }>(`/roles/${id}`, () => ({
      id,
      name: "Role",
      description: "",
      users: 0,
      permissions: 0,
      color: "#0D7A46",
      grantedPermissions: [],
    })),
  create: (payload: { name: string; permissions?: string[] }) =>
    apiCall(
      "/roles",
      () => ({
        id: `r_${Date.now()}`,
        name: payload.name,
        description: "",
        users: 0,
        permissions: payload.permissions?.length ?? 0,
        color: "#0D7A46",
      }) as Role,
      {
        method: "POST",
        body: payload,
      },
    ),
  update: (id: string, patch: { name?: string; permissions?: string[] }) =>
    apiCall<Role>(`/roles/${id}`, () => ({
      id,
      name: patch.name ?? "Role",
      description: "",
      users: 0,
      permissions: patch.permissions?.length ?? 0,
      color: "#0D7A46",
    }) as Role, {
      method: "PATCH",
      body: patch,
    }),
  remove: (id: string) => apiCall(`/roles/${id}`, () => ({ deleted: true }), { method: "DELETE" }),
  permissions: () => apiCall<PermissionGroup[]>("/permissions", () => []),
};
