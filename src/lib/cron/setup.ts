/**
 * Builds the exact strings an administrator pastes into cPanel.
 *
 * Every value here is a pure function of the server-reported paths in
 * `CronStatus.paths` plus the API base the browser is already using. It lives in
 * its own module, away from JSX, for one reason: a cron entry is either
 * character-for-character right or it silently never runs, and "character-for-
 * character right" is a property a test can assert. `setup.test.ts` pins each
 * command shape.
 *
 * Nothing in here interpolates a secret. The cURL fallback renders a
 * `YOUR_CRON_TOKEN` placeholder, because the token is never sent to the browser
 * (`/cron/status` returns only the boolean `tokenConfigured`).
 */

import type { CronPaths } from "@/lib/api";

/**
 * Namecheap's acceptable use policy forbids cron intervals shorter than five
 * minutes on shared and reseller hosting, and caps simultaneous cron entries at
 * five. Laravel's own documentation says `* * * * *`; following it here would put
 * the account in breach, so every recommendation in this module is built on the
 * five-minute floor instead.
 *
 * Consequence worth knowing: `schedule:run` firing at minutes 0,5,10…55 can only
 * trigger scheduled events whose due minute is a multiple of five. See the note
 * in `backend/routes/console.php`.
 */
export const SCHEDULE_EXPRESSION = "*/5 * * * *";

/** The reminder command on its own does not need five-minute resolution. */
export const REMINDER_ONLY_EXPRESSION = "0 * * * *";

/** Human labels for the two expressions, matching cPanel's "Common Settings". */
export const EXPRESSION_LABELS: Record<string, string> = {
  [SCHEDULE_EXPRESSION]: "Every 5 minutes",
  [REMINDER_ONLY_EXPRESSION]: "Once an hour, on the hour",
};

/** Placeholder rendered in place of the real token, which never reaches the browser. */
export const TOKEN_PLACEHOLDER = "YOUR_CRON_TOKEN";

export type PhpBinaryChoice = {
  /** The path to put in the cron entry. */
  path: string;
  /** True when the server confirmed this file exists and is executable. */
  verified: boolean;
  /** Other confirmed binaries, best first, for the "if that one fails" list. */
  alternatives: string[];
};

/**
 * Pick the PHP CLI binary for the cron entry.
 *
 * Order matters. `/usr/local/bin/php` is the cPanel-managed symlink that follows
 * the account's selected PHP version, so it keeps working after a version bump;
 * a versioned `ea-php83` path does not. It is preferred whenever the server
 * confirmed it exists, otherwise the first confirmed candidate wins.
 *
 * `PHP_BINARY` is deliberately never used. Under cPanel the web request is served
 * by a CGI or FPM binary (`php-cgi`, `lsphp`) which either refuses CLI arguments
 * or runs with a different php.ini; a cron entry built from it fails in ways that
 * look like an application bug.
 *
 * With nothing confirmed, falls back to the bare `php` on cron's PATH and reports
 * `verified: false` so the page can say the path needs checking.
 */
export function recommendedPhpBinary(paths: CronPaths): PhpBinaryChoice {
  const candidates = paths.phpCliCandidates ?? [];
  const preferred = candidates.find((p) => p === "/usr/local/bin/php") ?? candidates[0];

  if (!preferred) {
    return { path: "php", verified: false, alternatives: [] };
  }

  return {
    path: preferred,
    verified: true,
    alternatives: candidates.filter((p) => p !== preferred),
  };
}

/**
 * Absolute URL of the HTTP trigger, resolved the same way the app resolves every
 * other API call so the two can never disagree.
 *
 * `apiBase` is `VITE_API_BASE_URL`: absolute in production, relative (`/api/v1`)
 * in dev where Vite proxies. A relative base is joined to the page origin. With
 * no base configured at all it falls back to the backend's own `config('app.url')`
 * plus the standard prefix, which is the best guess available and is labelled as
 * such on the page.
 */
export function cronTriggerUrl(
  paths: CronPaths,
  apiBase: string | undefined,
  origin: string | undefined,
): string {
  const trimmedBase = apiBase?.replace(/\/+$/, "") ?? "";

  if (/^https?:\/\//i.test(trimmedBase)) {
    return `${trimmedBase}/cron/run`;
  }

  if (trimmedBase && origin) {
    const path = trimmedBase.startsWith("/") ? trimmedBase : `/${trimmedBase}`;
    return `${origin.replace(/\/+$/, "")}${path}/cron/run`;
  }

  const appUrl = (paths.appUrl || origin || "https://your-domain.com").replace(/\/+$/, "");
  return `${appUrl}/api/v1/cron/run`;
}

export type CronPlan = {
  php: PhpBinaryChoice;
  /** Preferred cPanel entry: the Laravel scheduler, covering every scheduled task. */
  scheduleCommand: string;
  /** Same thing with output kept, for the first run when you want to read it. */
  scheduleCommandLogged: string;
  /** Fallback for hosts that reject an absolute script path. */
  scheduleCommandCd: string;
  /** Reminders only, for an account that would rather not run the scheduler. */
  directCommand: string;
  /** Read-only: prints who would be mailed, sends nothing, writes nothing. */
  dryRunCommand: string;
  /** Last resort when cron cannot execute PHP at all. */
  curlCommand: string;
  /** The URL that cURL line hits, without the token, for reference. */
  triggerUrl: string;
  /** Tail the cron output file. */
  tailCronLog: string;
  /** Tail the application log, where a failed send is recorded. */
  tailAppLog: string;
};

/**
 * Assemble every command the setup page shows.
 *
 * `>/dev/null 2>&1` is on the recommended entry on purpose: cPanel emails the
 * account owner whatever a cron job prints, and `schedule:run` prints a line
 * every five minutes, so leaving output on generates roughly 8,600 emails a
 * month. The failure signal is preserved a better way — the reminder command
 * exits non-zero when every send in a batch failed, and cron still emails on a
 * non-zero exit even with output redirected.
 */
export function buildCronPlan(
  paths: CronPaths,
  apiBase: string | undefined,
  origin: string | undefined,
): CronPlan {
  const php = recommendedPhpBinary(paths);
  const artisan = paths.artisan || `${paths.basePath}/artisan`;
  const cronLog = paths.cronLogPath;
  const triggerUrl = cronTriggerUrl(paths, apiBase, origin);

  return {
    php,
    scheduleCommand: `${php.path} ${artisan} schedule:run >/dev/null 2>&1`,
    scheduleCommandLogged: `${php.path} ${artisan} schedule:run >> ${cronLog} 2>&1`,
    scheduleCommandCd: `cd ${paths.basePath} && ${php.path} artisan schedule:run >/dev/null 2>&1`,
    directCommand: `${php.path} ${artisan} waitlist:send-verification-reminders >> ${cronLog} 2>&1`,
    dryRunCommand: `${php.path} ${artisan} waitlist:send-verification-reminders --dry-run`,
    curlCommand: `curl -fsS -H "X-Cron-Token: ${TOKEN_PLACEHOLDER}" "${triggerUrl}" >/dev/null`,
    triggerUrl,
    tailCronLog: `tail -n 50 ${cronLog}`,
    tailAppLog: `tail -n 100 ${paths.logPath}`,
  };
}

/**
 * "3 days", "1 day". Used in prose where a bare number would read wrong.
 */
export function pluralDays(days: number): string {
  return `${days} day${days === 1 ? "" : "s"}`;
}

/**
 * How long an address can stay in the reminder cycle: interval × cap.
 * Returns null when the cap is disabled, which means "forever".
 */
export function cycleLengthDays(intervalDays: number, maxPerEntry: number): number | null {
  if (maxPerEntry <= 0) return null;
  return intervalDays * maxPerEntry;
}

/**
 * Largest-fitting unit, in seconds. Months are 30 days and years 365; a cron
 * status line does not need calendar-accurate month arithmetic, and a fixed table
 * keeps this function pure and trivially testable.
 */
const RELATIVE_UNITS: Array<[seconds: number, name: string]> = [
  [31_536_000, "year"],
  [2_592_000, "month"],
  [604_800, "week"],
  [86_400, "day"],
  [3_600, "hour"],
  [60, "minute"],
  [1, "second"],
];

/**
 * ISO timestamp to "4 minutes ago" / "in 2 hours", or "never" for null.
 *
 * `now` is a parameter rather than a `Date.now()` call so the output is a pure
 * function of its inputs and the tests do not need fake timers.
 */
export function relativeTime(iso: string | null, now: number = Date.now()): string {
  if (!iso) return "never";

  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "unknown";

  const seconds = Math.round((now - then) / 1000);
  const future = seconds < 0;
  const abs = Math.abs(seconds);

  for (const [step, name] of RELATIVE_UNITS) {
    if (abs >= step || step === 1) {
      const value = Math.max(1, Math.floor(abs / step));
      const plural = `${value} ${name}${value === 1 ? "" : "s"}`;

      return future ? `in ${plural}` : `${plural} ago`;
    }
  }

  // Unreachable: the table ends at 1 second, which every value clears.
  return "unknown";
}

/** Milliseconds to a short human string. `null` for a run that never finished. */
export function humanMs(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}
