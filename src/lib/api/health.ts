import { apiCall } from "./client";

/** One probe result. `latencyMs` is null when the check could not run at all. */
export type HealthCheck = {
  key: string;
  label: string;
  status: "ok" | "degraded" | "down";
  latencyMs: number | null;
  detail: string;
};

export type SystemHealth = {
  status: "ok" | "degraded" | "down";
  checkedAt: string;
  uptimeSeconds: number | null;
  checks: HealthCheck[];
  queue: {
    pending: number;
    failed: number;
    oldestPendingSeconds: number | null;
  };
  errors: {
    lastHour: number;
    last24h: number;
    rate: number;
  };
  storage: {
    writable: boolean;
    freeBytes: number | null;
  };
};

/**
 * System health API. Every field is a live probe run inside the request, not a
 * cached status page: the DB check issues a real query, the queue numbers read
 * `jobs`/`failed_jobs`, and the error counts read the log table.
 */
export const healthApi = {
  get: () => apiCall<SystemHealth>("/system/health", { timeoutMs: 30000 }),
};
