import { apiCall } from "./client";
import { toQuery } from "./waitlist";
import type { AdminUser } from "@/lib/types";

export type AdminUserListParams = {
  search?: string;
  role?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  per_page?: number;
};

export type AdminUserInput = {
  name: string;
  email: string;
  role: string;
  status?: "active" | "invited";
  password?: string;
  phone?: string | null;
  /** Send an invitation email with a password-reset link. */
  invite?: boolean;
};

/** Detail view: the list shape plus audit/session facts. */
export type AdminUserDetail = AdminUser & {
  roleSlug: string;
  permissions: string[];
  createdAt: string | null;
  lastActiveAt: string | null;
  emailVerified: boolean;
  phone: string | null;
  timezone: string | null;
  avatarUrl: string | null;
  recentActivity: {
    id: number;
    action: string;
    target: string;
    time: string;
    ip: string;
  }[];
};

/** Admin panel users. Roles come from spatie, so `role` is the display label. */
export const usersApi = {
  list: (params?: AdminUserListParams) =>
    apiCall<AdminUser[]>(`/users${toQuery(params as Record<string, unknown>)}`),
  get: (id: string) => apiCall<AdminUserDetail>(`/users/${id}`),
  create: (payload: AdminUserInput) =>
    apiCall<AdminUser>("/users", { method: "POST", body: payload, timeoutMs: 30000 }),
  update: (id: string, patch: Partial<AdminUserInput>) =>
    apiCall<AdminUser>(`/users/${id}`, { method: "PATCH", body: patch }),
  remove: (id: string) =>
    apiCall<{ deleted: boolean }>(`/users/${id}`, { method: "DELETE" }),
  /** Re-send the invitation mail for a user still in `invited` status. */
  resendInvite: (id: string) =>
    apiCall<{ sent: boolean; message: string }>(`/users/${id}/invite`, {
      method: "POST",
      timeoutMs: 30000,
    }),
};
