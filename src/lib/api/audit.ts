import { apiCall } from "./client";
import { toQuery } from "./waitlist";

export type AuditEntry = {
  id: number;
  user: string;
  action: string;
  target: string;
  time: string;
  createdAt: string | null;
  ip: string;
  device: string;
  changes: Record<string, unknown> | null;
};

export type AuditListParams = {
  action?: string;
  user?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  per_page?: number;
};

/**
 * Audit log API. Rows are written by controllers as they mutate state, so this
 * is a record of what happened rather than a rendering of current state.
 */
export const auditApi = {
  list: (params?: AuditListParams) =>
    apiCall<AuditEntry[]>(`/audit-logs${toQuery(params as Record<string, unknown>)}`),
  /** Distinct action names, for the filter dropdown. */
  actions: () => apiCall<string[]>("/audit-logs/actions"),
  /** Distinct actor names, for the user dropdown. */
  actors: () => apiCall<string[]>("/audit-logs/actors"),
  /** DELETE /audit-logs — purge all log entries. Requires settings.edit-general. */
  clear: () => apiCall<{ cleared: number }>("/audit-logs", { method: "DELETE" }),
};
