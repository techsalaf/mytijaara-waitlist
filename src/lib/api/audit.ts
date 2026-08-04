import { apiCall } from "./client";

export type AuditEntry = {
  id: number;
  user: string;
  action: string;
  target: string;
  time: string;
  ip: string;
  device: string;
};

/**
 * Audit log API.
 *
 *   GET /audit-logs -> { data: AuditEntry[], meta: { total, current_page, last_page, per_page } }
 */
export const auditApi = {
  list: (params?: { action?: string; search?: string; page?: number; per_page?: number }) => {
    const q = new URLSearchParams();
    if (params?.action) q.set("action", params.action);
    if (params?.search) q.set("search", params.search);
    if (params?.page) q.set("page", String(params.page));
    if (params?.per_page) q.set("per_page", String(params.per_page));
    const qs = q.toString();
    return apiCall(`/audit-logs${qs ? `?${qs}` : ""}`, () => []);
  },
};
