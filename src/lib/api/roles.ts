import { apiCall } from "./client";
import { roles, permissionGroups } from "@/lib/mock-data";

export type Role = (typeof roles)[number];
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
  list: () => apiCall("/roles", () => roles),
  get: (id: string) =>
    apiCall(`/roles/${id}`, () => ({
      ...(roles.find((r) => r.id === id) ?? roles[0]),
      grantedPermissions: [] as string[],
    })),
  create: (payload: { name: string; permissions?: string[] }) =>
    apiCall("/roles", () => ({ ...roles[0], ...payload, id: `r_${Date.now()}` }) as Role, {
      method: "POST",
      body: payload,
    }),
  update: (id: string, patch: { name?: string; permissions?: string[] }) =>
    apiCall(`/roles/${id}`, () => ({ ...roles.find((r) => r.id === id)!, ...patch }), {
      method: "PATCH",
      body: patch,
    }),
  remove: (id: string) => apiCall(`/roles/${id}`, () => ({ deleted: true }), { method: "DELETE" }),
  permissions: () => apiCall("/permissions", () => permissionGroups),
};
