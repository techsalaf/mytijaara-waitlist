import { apiCall } from "./client";
import { adminUsers } from "@/lib/mock-data";

export type AdminUserRow = (typeof adminUsers)[number];

/**
 * Admin users API.
 *
 *   GET    /users      -> { data: AdminUser[] }
 *   GET    /users/:id  -> { data: AdminUser }
 *   POST   /users      -> { data: AdminUser }
 *   PATCH  /users/:id  -> { data: AdminUser }
 *   DELETE /users/:id  -> { data: { deleted } }
 */
export const usersApi = {
  list: () => apiCall("/users", () => adminUsers),
  get: (id: string) => apiCall(`/users/${id}`, () => adminUsers.find((u) => u.id === id) ?? null),
  create: (payload: { name: string; email: string; role: string; status?: string; password?: string }) =>
    apiCall(
      "/users",
      () =>
        ({
          id: `u_${Date.now()}`,
          name: payload.name,
          email: payload.email,
          role: payload.role,
          status: payload.status ?? "invited",
          lastActive: "—",
          avatar: payload.name.split(" ").map((n) => n[0]).slice(0, 2).join(""),
        }) as AdminUserRow,
      { method: "POST", body: payload },
    ),
  update: (id: string, patch: Partial<AdminUserRow> & { password?: string }) =>
    apiCall(`/users/${id}`, () => ({ ...adminUsers.find((u) => u.id === id)!, ...patch }), {
      method: "PATCH",
      body: patch,
    }),
  remove: (id: string) => apiCall(`/users/${id}`, () => ({ deleted: true }), { method: "DELETE" }),
};
