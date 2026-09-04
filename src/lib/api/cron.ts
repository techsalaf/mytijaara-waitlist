import { apiCall } from "./client";

/** One recorded execution of a scheduled task, from the `cron_runs` table. */
export type CronRunRow = {
  id: number;
  task: string;
  trigger: "schedule" | "http" | "manual" | string;
  status: "running" | "success" | "partial" | "failed" | string;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  durationMs: number | null;
  message: string | null;
  startedAt: string | null;
  finishedAt: string | null;
};

/**
 * Literal strings read off the server that runs the cron, so the setup page can
 * render a command that is correct on first paste instead of a template with
 * placeholders for the operator to fill in wrong.
 *
 * `phpCliCandidates` is the subset of the usual shared-hosting PHP binaries that
 * actually exist on that machine. `phpBinary` is the binary serving the web
 * request, which on cPanel is a CGI/FPM binary and is NOT what cron should call.
 */
export type CronPaths = {
  basePath: string;
  artisan: string;
  appUrl: string;
  logPath: string;
  cronLogPath: string;
  phpVersion: string;
  phpSapi: string;
  phpBinary: string;
  phpCliCandidates: string[];
};

/**
 * Everything `/admin/cron-setup` renders, read in one request so the page can
 * never show numbers sampled at two different instants.
 *
 * `dueNow` is the count from the exact same query the command sends from, so the
 * number here is the number that will be mailed on the next run.
 */
export type CronStatus = {
  // Configuration, as the server sees it.
  enabled: boolean;
  intervalDays: number;
  maxPerEntry: number;
  batchSize: number;
  command: string;
  httpTaskKeys: string[];
  /** Whether CRON_TOKEN is set. The token value itself is never sent. */
  tokenConfigured: boolean;
  paths: CronPaths;

  // Audience.
  unverifiedTotal: number;
  eligibleTotal: number;
  dueNow: number;
  cappedOut: number;

  // Throughput over the trailing 30 days.
  remindersSent30d: number;
  remindersFailed30d: number;
  runs30d: number;
  lastReminderAt: string | null;

  // Evidence that cron is firing.
  lastRun: CronRunRow | null;
  lastSuccessfulRun: CronRunRow | null;
  lastAnyTaskRun: CronRunRow | null;
  lastError: string | null;
  lastErrorAt: string | null;
  schedulerHealthy: boolean;
  recentRuns: CronRunRow[];
};

export type CronRunNowResult = {
  command: string;
  exitCode: number;
  output: string;
  stats: CronStatus;
};

/**
 * Scheduled-task monitoring. Both endpoints sit behind Sanctum; `runNow`
 * additionally needs `settings.edit-general` because it sends real mail.
 *
 * The public trigger (`/cron/run`) is deliberately absent from this client. It is
 * for the host's cron, is authenticated by a server-side shared secret, and must
 * never be called from the browser.
 */
export const cronApi = {
  status: () => apiCall<CronStatus>("/cron/status"),
  runNow: (task = "reminders") =>
    apiCall<CronRunNowResult>("/cron/run-now", {
      method: "POST",
      body: { task },
      timeoutMs: 60000,
    }),
};
