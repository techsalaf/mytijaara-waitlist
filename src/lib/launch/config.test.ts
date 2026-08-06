import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  DEFAULT_LAUNCH_CONFIG,
  celebrationWindowMs,
  formatLaunchDate,
  formatLaunchTime,
  getTimeRemaining,
  humanizeRemaining,
  normalizeLaunchConfig,
  resolveLaunchStatus,
  tickerText,
  type LaunchConfiguration,
} from "./config";

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;

/** A config pinned to a known launch instant. */
function config(overrides: Partial<LaunchConfiguration> = {}): LaunchConfiguration {
  return { ...DEFAULT_LAUNCH_CONFIG, launchDateTime: "2026-10-02T10:00:00+01:00", ...overrides };
}

const LAUNCH = new Date("2026-10-02T10:00:00+01:00").getTime();

describe("resolveLaunchStatus", () => {
  it("is pre_launch a second before the launch instant", () => {
    expect(resolveLaunchStatus(config(), LAUNCH - 1000)).toBe("pre_launch");
  });

  it("flips to launch_day exactly at the launch instant", () => {
    expect(resolveLaunchStatus(config(), LAUNCH)).toBe("launch_day");
  });

  it("stays launch_day through the whole celebration window", () => {
    expect(resolveLaunchStatus(config(), LAUNCH + 3 * DAY - 1000)).toBe("launch_day");
  });

  it("becomes post_launch the instant the window closes", () => {
    // This boundary is what makes the banner, confetti and ribbon disappear on
    // their own, with no admin action and no leftover whitespace.
    expect(resolveLaunchStatus(config(), LAUNCH + 3 * DAY)).toBe("post_launch");
  });

  it("honours an admin-pinned status regardless of the clock", () => {
    const pinned = config({ launchStatus: "launch_day" });
    expect(resolveLaunchStatus(pinned, LAUNCH - 400 * DAY)).toBe("launch_day");
  });

  it("falls back to pre_launch when the date is unparseable", () => {
    expect(resolveLaunchStatus(config({ launchDateTime: "not a date" }), LAUNCH)).toBe("pre_launch");
  });

  it("goes straight to post_launch when the window is zero days", () => {
    expect(resolveLaunchStatus(config({ launchCelebrationDays: 0 }), LAUNCH)).toBe("post_launch");
  });
});

describe("celebrationWindowMs", () => {
  it("converts whole days to milliseconds", () => {
    expect(celebrationWindowMs(config({ launchCelebrationDays: 3 }))).toBe(3 * DAY);
  });

  it("clamps a negative value to zero rather than making the window infinite", () => {
    expect(celebrationWindowMs(config({ launchCelebrationDays: -5 }))).toBe(0);
  });

  it("caps at 30 days", () => {
    expect(celebrationWindowMs(config({ launchCelebrationDays: 9999 }))).toBe(30 * DAY);
  });

  it("falls back to 3 days when the value is not a number", () => {
    expect(
      celebrationWindowMs(config({ launchCelebrationDays: NaN as unknown as number })),
    ).toBe(3 * DAY);
  });
});

describe("getTimeRemaining", () => {
  it("breaks the gap into days, hours, minutes and seconds", () => {
    const r = getTimeRemaining(
      "2026-10-02T10:00:00+01:00",
      LAUNCH - (2 * DAY + 3 * HOUR + 4 * MINUTE + 5000),
    );
    expect(r).toMatchObject({ days: 2, hours: 3, minutes: 4, seconds: 5 });
  });

  it("clamps to zero after launch instead of going negative", () => {
    const r = getTimeRemaining("2026-10-02T10:00:00+01:00", LAUNCH + DAY);
    expect(r).toMatchObject({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 });
  });

  it("returns zero for an unparseable date rather than NaN digits", () => {
    expect(getTimeRemaining("nonsense", LAUNCH).total).toBe(0);
  });
});

describe("humanizeRemaining and tickerText", () => {
  it("uses the largest non-zero unit", () => {
    expect(humanizeRemaining(getTimeRemaining("2026-10-02T10:00:00+01:00", LAUNCH - 5 * DAY))).toBe("5 days");
    expect(humanizeRemaining(getTimeRemaining("2026-10-02T10:00:00+01:00", LAUNCH - 3 * HOUR))).toBe("3 hours");
    expect(humanizeRemaining(getTimeRemaining("2026-10-02T10:00:00+01:00", LAUNCH - 9 * MINUTE))).toBe("9 minutes");
    expect(humanizeRemaining(getTimeRemaining("2026-10-02T10:00:00+01:00", LAUNCH - 8000))).toBe("8 seconds");
  });

  it("singularises one of each unit", () => {
    expect(humanizeRemaining(getTimeRemaining("2026-10-02T10:00:00+01:00", LAUNCH - DAY))).toBe("1 day");
    expect(humanizeRemaining(getTimeRemaining("2026-10-02T10:00:00+01:00", LAUNCH - HOUR))).toBe("1 hour");
    expect(humanizeRemaining(getTimeRemaining("2026-10-02T10:00:00+01:00", LAUNCH - MINUTE))).toBe("1 minute");
  });

  it("never renders a bare zero, so the ribbon cannot read '0 to go'", () => {
    expect(humanizeRemaining(getTimeRemaining("2026-10-02T10:00:00+01:00", LAUNCH))).toBe("0 seconds");
  });

  it("substitutes every {days} placeholder in the ticker template", () => {
    const cfg = config({ ticker: { ...DEFAULT_LAUNCH_CONFIG.ticker, text: "{days} left — only {days}!" } });
    const text = tickerText(cfg, getTimeRemaining(cfg.launchDateTime, LAUNCH - 4 * DAY));
    expect(text).toBe("4 days left — only 4 days!");
  });
});

describe("normalizeLaunchConfig", () => {
  it("fills a completely empty payload from the defaults", () => {
    expect(normalizeLaunchConfig(null)).toEqual(DEFAULT_LAUNCH_CONFIG);
    expect(normalizeLaunchConfig("nope")).toEqual(DEFAULT_LAUNCH_CONFIG);
  });

  it("merges nested objects key-by-key instead of replacing them", () => {
    // The backend deep-merges PATCH bodies, so an admin who only ever saved a
    // ticker label leaves every sibling key missing.
    const result = normalizeLaunchConfig({ ticker: { text: "Custom {days}" } });

    expect(result.ticker.text).toBe("Custom {days}");
    expect(result.ticker.enabled).toBe(DEFAULT_LAUNCH_CONFIG.ticker.enabled);
    expect(result.ticker.liveText).toBe(DEFAULT_LAUNCH_CONFIG.ticker.liveText);
  });

  it("keeps the default store list when the payload has an empty one", () => {
    const result = normalizeLaunchConfig({ live: { stores: [] } });
    expect(result.live.stores).toEqual(DEFAULT_LAUNCH_CONFIG.live.stores);
  });

  it("rejects an unparseable launchDateTime rather than rendering NaN", () => {
    expect(normalizeLaunchConfig({ launchDateTime: "15/11/2026" }).launchDateTime).toBe(
      DEFAULT_LAUNCH_CONFIG.launchDateTime,
    );
  });

  it("clamps launchCelebrationDays from the payload", () => {
    expect(normalizeLaunchConfig({ launchCelebrationDays: 500 }).launchCelebrationDays).toBe(30);
    expect(normalizeLaunchConfig({ launchCelebrationDays: -1 }).launchCelebrationDays).toBe(0);
    expect(normalizeLaunchConfig({ launchCelebrationDays: "abc" as unknown as number }).launchCelebrationDays).toBe(3);
  });

  it("accepts a valid override wholesale", () => {
    const result = normalizeLaunchConfig({ launchDateTime: "2027-01-01T00:00:00+01:00", waitlistEnabled: false });
    expect(result.launchDateTime).toBe("2027-01-01T00:00:00+01:00");
    expect(result.waitlistEnabled).toBe(false);
  });
});

describe("date formatting", () => {
  it("renders the date in the launch timezone, not the machine timezone", () => {
    // 23:30 UTC on 1 Oct is already 2 Oct in Lagos (UTC+1).
    const cfg = config({ launchDateTime: "2026-10-01T23:30:00Z", timezone: "Africa/Lagos" });
    expect(formatLaunchDate(cfg)).toBe("Friday, 2 October 2026");
  });

  it("appends the zone name to the time", () => {
    expect(formatLaunchTime(config())).toBe("10:00 AM (Africa/Lagos)");
  });

  it("returns an empty string for an invalid timezone instead of throwing", () => {
    expect(formatLaunchDate(config({ timezone: "Mars/Olympus" }))).toBe("");
    expect(formatLaunchTime(config({ timezone: "Mars/Olympus" }))).toBe("");
  });
});

describe("seeder parity", () => {
  /**
   * DEFAULT_LAUNCH_CONFIG is only reached when GET /launch-config fails, but a
   * freshly seeded database must serve the same values or a new environment
   * renders different content from a failed-fetch one. The seeder previously
   * carried the old 2026-11-15 date and no ticker block at all.
   */
  const seeder = readFileSync(
    resolve(__dirname, "../../../backend/database/seeders/LaunchConfigSeeder.php"),
    "utf8",
  );

  it("seeds the same launch date as the frontend default", () => {
    expect(seeder).toContain(`'launchDateTime' => '${DEFAULT_LAUNCH_CONFIG.launchDateTime}'`);
  });

  it("seeds the October date, not the retired November one", () => {
    expect(DEFAULT_LAUNCH_CONFIG.launchDateTime.startsWith("2026-10-02")).toBe(true);
    expect(seeder).not.toContain("2026-11-15");
  });

  it("seeds the same celebration window", () => {
    expect(seeder).toContain(
      `'launchCelebrationDays' => ${DEFAULT_LAUNCH_CONFIG.launchCelebrationDays}`,
    );
  });

  it("seeds every top-level key the frontend expects", () => {
    for (const key of Object.keys(DEFAULT_LAUNCH_CONFIG)) {
      expect(seeder, `seeder is missing '${key}'`).toContain(`'${key}' =>`);
    }
  });

  it("seeds every ticker key", () => {
    for (const key of Object.keys(DEFAULT_LAUNCH_CONFIG.ticker)) {
      expect(seeder, `seeder ticker is missing '${key}'`).toContain(`'${key}' =>`);
    }
  });
});
