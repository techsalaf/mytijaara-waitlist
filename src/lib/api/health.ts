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
  php: {
    version: string;
    memoryLimit: string;
    memoryPeakUsage: number;
    extensions: string[];
  };
  server: {
    os: string;
    webServer: string;
    laravelVersion: string;
    environment: string;
  };
};

/** One recorded sample. Written by the probe, read back for the latency chart. */
export type HealthSample = {
  at: string | null;
  status: "ok" | "degraded" | "down";
  dbLatencyMs: number | null;
  cacheLatencyMs: number | null;
  storageLatencyMs: number | null;
  queuePending: number;
  queueFailed: number;
  errorsLastHour: number;
};

/**
 * System health API. Every field is a live probe run inside the request, not a
 * cached status page: the DB check issues a real query, the queue numbers read
 * `jobs`/`failed_jobs`, and the error counts read the log files.
 *
 * `history` is separate from `get` so opening the page does not multiply the
 * probe cost by the number of chart points.
 */
export const healthApi = {
  get: () => apiCall<SystemHealth>("/system/health", { timeoutMs: 30000 }),
  history: (hours = 24) => apiCall<HealthSample[]>(`/system/health/history?hours=${hours}`),
};
