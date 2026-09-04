import { describe, expect, it } from "vitest";
import type { CronPaths } from "@/lib/api";
import {
  REMINDER_ONLY_EXPRESSION,
  SCHEDULE_EXPRESSION,
  TOKEN_PLACEHOLDER,
  buildCronPlan,
  cronTriggerUrl,
  cycleLengthDays,
  humanMs,
  pluralDays,
  recommendedPhpBinary,
  relativeTime,
} from "./setup";

/**
 * A cron entry is either character-for-character right or it silently never runs.
 * These tests are the only thing standing between a refactor and a scheduled task
 * that stops firing on a server nobody is watching.
 */

const PATHS: CronPaths = {
  basePath: "/home/mytijaaracp/api",
  artisan: "/home/mytijaaracp/api/artisan",
  appUrl: "https://mytijaara.com",
  logPath: "/home/mytijaaracp/api/storage/logs/laravel.log",
  cronLogPath: "/home/mytijaaracp/api/storage/logs/cron.log",
  phpVersion: "8.3.14",
  phpSapi: "cgi-fcgi",
  phpBinary: "/opt/cpanel/ea-php83/root/usr/bin/php-cgi",
  phpCliCandidates: ["/usr/local/bin/php", "/opt/cpanel/ea-php83/root/usr/bin/php"],
};

function paths(overrides: Partial<CronPaths> = {}): CronPaths {
  return { ...PATHS, ...overrides };
}

describe("recommendedPhpBinary", () => {
  it("prefers the cPanel-managed symlink so a PHP version bump does not break cron", () => {
    const choice = recommendedPhpBinary(
      paths({
        phpCliCandidates: [
          "/opt/cpanel/ea-php83/root/usr/bin/php",
          "/usr/local/bin/php",
          "/usr/bin/php",
        ],
      }),
    );

    expect(choice.path).toBe("/usr/local/bin/php");
    expect(choice.verified).toBe(true);
    expect(choice.alternatives).toEqual([
      "/opt/cpanel/ea-php83/root/usr/bin/php",
      "/usr/bin/php",
    ]);
  });

  it("falls back to the first confirmed binary when the symlink is absent", () => {
    const choice = recommendedPhpBinary(
      paths({ phpCliCandidates: ["/opt/alt/php82/usr/bin/php", "/usr/bin/php"] }),
    );

    expect(choice.path).toBe("/opt/alt/php82/usr/bin/php");
    expect(choice.verified).toBe(true);
  });

  it("reports an unverified bare `php` when the server confirmed nothing", () => {
    const choice = recommendedPhpBinary(paths({ phpCliCandidates: [] }));

    expect(choice).toEqual({ path: "php", verified: false, alternatives: [] });
  });

  it("never uses PHP_BINARY, which under cPanel is a CGI binary", () => {
    // The web SAPI binary cannot be trusted to accept CLI arguments. If this ever
    // leaks into the recommendation the cron entry fails in a way that looks like
    // an application bug.
    const choice = recommendedPhpBinary(paths());

    expect(choice.path).not.toBe(PATHS.phpBinary);
    expect(choice.alternatives).not.toContain(PATHS.phpBinary);
  });

  it("survives a payload from an older backend with no candidate list", () => {
    // JSON.stringify drops undefined-valued keys, so this is literally the wire
    // payload a backend without `phpCliCandidates` would send.
    const legacy = JSON.parse(
      JSON.stringify({ ...PATHS, phpCliCandidates: undefined }),
    ) as CronPaths;

    expect(recommendedPhpBinary(legacy).path).toBe("php");
  });
});

describe("cronTriggerUrl", () => {
  it("uses an absolute API base verbatim", () => {
    expect(cronTriggerUrl(paths(), "https://api.mytijaara.com/api/v1", "https://mytijaara.com")).toBe(
      "https://api.mytijaara.com/api/v1/cron/run",
    );
  });

  it("strips a trailing slash from the base rather than doubling it", () => {
    expect(cronTriggerUrl(paths(), "https://api.mytijaara.com/api/v1/", undefined)).toBe(
      "https://api.mytijaara.com/api/v1/cron/run",
    );
  });

  it("joins a relative base to the page origin", () => {
    expect(cronTriggerUrl(paths(), "/api/v1", "https://admin.mytijaara.com")).toBe(
      "https://admin.mytijaara.com/api/v1/cron/run",
    );
  });

  it("adds the leading slash a misconfigured relative base is missing", () => {
    expect(cronTriggerUrl(paths(), "api/v1", "https://admin.mytijaara.com")).toBe(
      "https://admin.mytijaara.com/api/v1/cron/run",
    );
  });

  it("falls back to the backend's own app URL when no base is configured", () => {
    expect(cronTriggerUrl(paths(), undefined, undefined)).toBe(
      "https://mytijaara.com/api/v1/cron/run",
    );
  });

  it("degrades to a visible placeholder host when nothing at all is known", () => {
    expect(cronTriggerUrl(paths({ appUrl: "" }), undefined, undefined)).toBe(
      "https://your-domain.com/api/v1/cron/run",
    );
  });
});

describe("buildCronPlan", () => {
  const plan = buildCronPlan(paths(), "https://api.mytijaara.com/api/v1", "https://mytijaara.com");

  it("builds the recommended scheduler entry with output silenced", () => {
    // cPanel emails the account owner whatever a cron job prints. `schedule:run`
    // prints on every tick, so leaving output on is ~8,600 emails a month.
    expect(plan.scheduleCommand).toBe(
      "/usr/local/bin/php /home/mytijaaracp/api/artisan schedule:run >/dev/null 2>&1",
    );
  });

  it("offers a logged variant for the first run", () => {
    expect(plan.scheduleCommandLogged).toBe(
      "/usr/local/bin/php /home/mytijaaracp/api/artisan schedule:run >> /home/mytijaaracp/api/storage/logs/cron.log 2>&1",
    );
  });

  it("offers a cd-first variant for hosts that reject an absolute script path", () => {
    expect(plan.scheduleCommandCd).toBe(
      "cd /home/mytijaaracp/api && /usr/local/bin/php artisan schedule:run >/dev/null 2>&1",
    );
  });

  it("builds a reminders-only entry that does not need the scheduler", () => {
    expect(plan.directCommand).toContain("waitlist:send-verification-reminders");
    expect(plan.directCommand).not.toContain("schedule:run");
    expect(plan.directCommand).toContain("/home/mytijaaracp/api/storage/logs/cron.log");
  });

  it("builds a dry run that writes nothing, so it is safe to paste into a live shell", () => {
    expect(plan.dryRunCommand).toBe(
      "/usr/local/bin/php /home/mytijaaracp/api/artisan waitlist:send-verification-reminders --dry-run",
    );
    expect(plan.dryRunCommand).not.toContain(">>");
  });

  it("sends the token as a header in the cURL fallback, keeping it out of access logs", () => {
    expect(plan.curlCommand).toContain(`-H "X-Cron-Token: ${TOKEN_PLACEHOLDER}"`);
    expect(plan.curlCommand).toContain('"https://api.mytijaara.com/api/v1/cron/run"');
    expect(plan.curlCommand).not.toContain("?token=");
  });

  it("never renders a real token, because the browser is never told one", () => {
    const serialized = JSON.stringify(plan);

    expect(serialized).toContain(TOKEN_PLACEHOLDER);
    // Any 32-byte hex secret would match this; the placeholder must not.
    expect(serialized).not.toMatch(/[0-9a-f]{32,}/i);
  });

  it("derives every path from the server payload, hardcoding none of them", () => {
    const other = buildCronPlan(
      paths({
        basePath: "/home/other/laravel",
        artisan: "/home/other/laravel/artisan",
        cronLogPath: "/home/other/laravel/storage/logs/cron.log",
        logPath: "/home/other/laravel/storage/logs/laravel.log",
        phpCliCandidates: ["/usr/bin/php"],
      }),
      "/api/v1",
      "https://other.test",
    );

    expect(other.scheduleCommand).toBe(
      "/usr/bin/php /home/other/laravel/artisan schedule:run >/dev/null 2>&1",
    );
    expect(other.tailAppLog).toBe("tail -n 100 /home/other/laravel/storage/logs/laravel.log");
    expect(other.tailCronLog).toBe("tail -n 50 /home/other/laravel/storage/logs/cron.log");
    expect(other.triggerUrl).toBe("https://other.test/api/v1/cron/run");
  });

  it("reconstructs the artisan path when an older backend omits it", () => {
    const plan2 = buildCronPlan(paths({ artisan: "" }), undefined, undefined);

    expect(plan2.scheduleCommand).toContain("/home/mytijaaracp/api/artisan schedule:run");
  });
});

describe("cron expressions", () => {
  it("respects Namecheap's five-minute floor for shared hosting", () => {
    // Their acceptable use policy forbids intervals under five minutes. Laravel's
    // documented `* * * * *` would put the account in breach.
    expect(SCHEDULE_EXPRESSION).toBe("*/5 * * * *");
    expect(SCHEDULE_EXPRESSION).not.toBe("* * * * *");
  });

  it("keeps the reminder-only expression on a minute the scheduler can reach", () => {
    // `schedule:run` at */5 can only fire events whose due minute is a multiple
    // of five. Minute 0 qualifies; minute 7 would silently never run.
    const minute = REMINDER_ONLY_EXPRESSION.split(" ")[0];

    expect(Number(minute) % 5).toBe(0);
  });
});

describe("pluralDays", () => {
  it("pluralises", () => {
    expect(pluralDays(1)).toBe("1 day");
    expect(pluralDays(3)).toBe("3 days");
    expect(pluralDays(0)).toBe("0 days");
  });
});

describe("cycleLengthDays", () => {
  it("multiplies the interval by the cap", () => {
    expect(cycleLengthDays(3, 5)).toBe(15);
  });

  it("returns null when the cap is disabled, which means the cycle never ends", () => {
    expect(cycleLengthDays(3, 0)).toBeNull();
  });
});

describe("relativeTime", () => {
  const now = Date.parse("2026-09-03T12:00:00Z");

  it("says never for a null timestamp rather than inventing a date", () => {
    expect(relativeTime(null, now)).toBe("never");
  });

  it("handles an unparseable value without throwing", () => {
    expect(relativeTime("not a date", now)).toBe("unknown");
  });

  it("picks the largest fitting unit", () => {
    expect(relativeTime("2026-09-03T11:59:30Z", now)).toBe("30 seconds ago");
    expect(relativeTime("2026-09-03T11:55:00Z", now)).toBe("5 minutes ago");
    expect(relativeTime("2026-09-03T09:00:00Z", now)).toBe("3 hours ago");
    expect(relativeTime("2026-09-01T12:00:00Z", now)).toBe("2 days ago");
    expect(relativeTime("2026-08-20T12:00:00Z", now)).toBe("2 weeks ago");
    expect(relativeTime("2026-06-03T12:00:00Z", now)).toBe("3 months ago");
    expect(relativeTime("2024-09-03T12:00:00Z", now)).toBe("2 years ago");
  });

  it("uses the singular for exactly one unit", () => {
    expect(relativeTime("2026-09-03T11:59:00Z", now)).toBe("1 minute ago");
    expect(relativeTime("2026-09-02T12:00:00Z", now)).toBe("1 day ago");
  });

  it("never rounds a past timestamp up into the future", () => {
    // Flooring matters: "in 1 hour" printed for something that already happened
    // would read as a scheduler that is running ahead of the clock.
    expect(relativeTime("2026-09-03T11:00:01Z", now)).toBe("59 minutes ago");
  });

  it("labels a future timestamp as future", () => {
    expect(relativeTime("2026-09-03T13:00:00Z", now)).toBe("in 1 hour");
  });

  it("floors sub-second differences to one second instead of zero", () => {
    expect(relativeTime("2026-09-03T12:00:00Z", now)).toBe("1 second ago");
  });
});

describe("humanMs", () => {
  it("renders an em dash for a run that never finished", () => {
    expect(humanMs(null)).toBe("—");
  });

  it("scales the unit with the magnitude", () => {
    expect(humanMs(0)).toBe("0ms");
    expect(humanMs(940)).toBe("940ms");
    expect(humanMs(1500)).toBe("1.5s");
    expect(humanMs(59_400)).toBe("59.4s");
    expect(humanMs(65_000)).toBe("1m 5s");
    expect(humanMs(3_600_000)).toBe("60m 0s");
  });
});
