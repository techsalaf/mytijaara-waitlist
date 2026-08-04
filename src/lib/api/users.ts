import { apiCall } from "./client";
import type { AdminUser } from "@/lib/types";

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
  list: () => apiCall<AdminUser[]>("/users", () => []),
  get: (id: string) => apiCall<AdminUser | null>(`/users/${id}`, () => null),
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
          avatar: payload.name
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join(""),
        }) as AdminUser,
      { method: "POST", body: payload },
    ),
  update: (id: string, patch: Partial<AdminUser> & { password?: string }) =>
    apiCall<AdminUser>(`/users/${id}`, () => ({ id, ...patch } as AdminUser), {
      method: "PATCH",
      body: patch,
    }),
  remove: (id: string) => apiCall(`/users/${id}`, () => ({ deleted: true }), { method: "DELETE" }),
};
