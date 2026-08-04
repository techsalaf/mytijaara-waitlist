import { apiCall } from "./client";
import type { Role } from "@/lib/types";

export type PermissionItem = { key: string; label: string };

export type PermissionGroup = {
  group: string;
  label: string;
  permissions: PermissionItem[];
};

export type RoleDetail = Role & {
  slug: string;
  grantedPermissions: string[];
  builtIn: boolean;
};

export type RoleInput = {
  name: string;
  description?: string;
  color?: string;
  permissions?: string[];
};

/**
 * Roles + permissions API. Roles are spatie roles; the permission catalogue in
 * `/permissions` is generated from `RoleSeeder::GROUPS`, which is the same list
 * the `permission:` route middleware enforces.
 */
export const rolesApi = {
  list: () => apiCall<Role[]>("/roles"),
  get: (id: string) => apiCall<RoleDetail>(`/roles/${id}`),
  create: (payload: RoleInput) => apiCall<RoleDetail>("/roles", { method: "POST", body: payload }),
  update: (id: string, patch: Partial<RoleInput>) =>
    apiCall<RoleDetail>(`/roles/${id}`, { method: "PATCH", body: patch }),
  /** Built-in seeded roles are refused with a 422 rather than silently kept. */
  remove: (id: string) => apiCall<{ deleted: boolean }>(`/roles/${id}`, { method: "DELETE" }),
  permissions: () => apiCall<PermissionGroup[]>("/permissions"),
};
