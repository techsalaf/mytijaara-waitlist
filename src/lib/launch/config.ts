/**
 * Launch configuration — the single source of truth for the pre-launch /
 * launch-day / post-launch behaviour of the marketing site.
 *
 * The backend serves this exact shape from `GET /launch-config` and the `/`
 * route loads it in its SSR loader, so the real admin-configured date is in
 * the first painted HTML. `DEFAULT_LAUNCH_CONFIG` is only the last-resort
 * shape used when that request fails; it must stay byte-identical to
 * `backend/database/seeders/LaunchConfigSeeder.php`.
 *
 * Every consumer reads the config through `useLaunch()` in
 * `src/components/launch/launch-state-provider.tsx`.
 */

export type LaunchStatus = "pre_launch" | "launch_day" | "post_launch";

/** `auto` = derive the state from `launchDateTime`. Anything else pins it
 *  (useful for previewing launch day from the CMS before the real date). */
export type LaunchStatusSetting = LaunchStatus | "auto";

export type LaunchCta = {
  label: string;
  /** In-page anchor (`#waitlist`) or absolute URL. */
  href: string;
  /** `true` hides the CTA entirely. */
  hidden?: boolean;
};

export type AppStoreLink = {
  platform: "android" | "ios";
  label: string;
  sublabel: string;
  href: string;
  /** Store not live yet — renders disabled with a "coming soon" hint. */
  comingSoon?: boolean;
};

/**
 * The thin marquee strip above the nav. Pre-launch it counts down; on launch
 * day it switches to `liveText` and fires confetti for first-time visitors.
 */
export type LaunchTicker = {
  enabled: boolean;
  /** `{days}` is replaced with the whole days remaining. */
  text: string;
  /** Shown for the whole celebration window instead of `text`. */
  liveText: string;
  /** Where the strip links to. Empty string renders a non-clickable strip. */
  href: string;
  /** Fire confetti from the ribbon on a first-time visitor's launch-day load. */
  confetti: boolean;
};

export type LaunchConfiguration = {
  /** Master switch for the whole launch section. */
  launchEnabled: boolean;
  /** Show the ticking countdown (only meaningful pre-launch). */
  countdownEnabled: boolean;
  /** When false the waitlist section + waitlist CTAs disappear. */
  waitlistEnabled: boolean;

  /** ISO-8601 with an explicit UTC offset — never a bare local string. */
  launchDateTime: string;
  /** IANA zone used for the human-readable date line. */
  timezone: string;

  /**
   * How long the celebration lasts. After `launchDateTime +
   * launchCelebrationDays` the site drops to `post_launch`: no banner, no
   * confetti, no ribbon, no countdown, no waitlist — the plain homepage.
   */
  launchCelebrationDays: number;

  badge: string;
  launchTitle: string;
  launchSubtitle: string;

  primaryCTA: LaunchCta;
  secondaryCTA: LaunchCta;

  /** `auto` unless an admin pins a state from the CMS. */
  launchStatus: LaunchStatusSetting;

  /** Thin animated strip pinned above the nav. */
  ticker: LaunchTicker;

  /** Copy + CTAs used once the app is live. */
  live: {
    badge: string;
    title: string;
    subtitle: string;
    /** Fire confetti once per session on the first load after launch. */
    confetti: boolean;
    stores: AppStoreLink[];
  };
};

/**
 * Last-resort shape used only when `GET /launch-config` fails. Keep in sync
 * with `backend/database/seeders/LaunchConfigSeeder.php`; the seeder-parity
 * block in `src/lib/launch/config.test.ts` reads that PHP file and fails if the
 * two drift.
 * Africa/Lagos is UTC+1 year-round, hence the `+01:00` offset.
 */
export const DEFAULT_LAUNCH_CONFIG: LaunchConfiguration = {
  launchEnabled: true,
  countdownEnabled: true,
  waitlistEnabled: true,

  launchDateTime: "2026-10-02T10:00:00+01:00",
  timezone: "Africa/Lagos",
  launchCelebrationDays: 3,

  badge: "🚀 Launching soon",
  launchTitle: "MyTijaara launches in…",
  launchSubtitle:
    "Thousands of Nigerians are already on the waitlist. Join them before launch and be among the first to experience one app for food, shopping, deliveries, and trusted services.",

  primaryCTA: { label: "Join the Waitlist", href: "#waitlist" },
  secondaryCTA: { label: "Learn More", href: "#services" },

  launchStatus: "auto",

  ticker: {
    enabled: true,
    text: "{days} to go until MyTijaara opens across Nigeria",
    liveText: "MyTijaara is live — download the app and place your first order",
    href: "#waitlist",
    confetti: true,
  },

  live: {
    badge: "🎉 We're live",
    title: "MyTijaara is here.",
    subtitle:
      "One app for food, shopping, deliveries and trusted services. Download MyTijaara and get your first order moving.",
    confetti: true,
    stores: [
      {
        platform: "android",
        label: "Google Play",
        sublabel: "Get it on",
        href: "https://play.google.com/store",
      },
      {
        platform: "ios",
        label: "App Store",
        sublabel: "Download on the",
        href: "#",
        comingSoon: true,
      },
    ],
  },
};

/** Milliseconds in a day. */
const DAY_MS = 24 * 60 * 60 * 1000;

/** Celebration window length in ms, clamped to 0..30 days. */
export function celebrationWindowMs(config: LaunchConfiguration): number {
  const days = Number(config.launchCelebrationDays);
  if (!Number.isFinite(days)) return 3 * DAY_MS;
  return Math.min(30, Math.max(0, days)) * DAY_MS;
}

/**
 * Derive the effective status. Honours an admin-pinned `launchStatus`.
 *
 * pre_launch  : now < launchDateTime
 * launch_day  : launchDateTime <= now < launchDateTime + celebration window
 * post_launch : after that — the site becomes the plain production homepage
 */
export function resolveLaunchStatus(
  config: LaunchConfiguration,
  now: number,
): LaunchStatus {
  if (config.launchStatus !== "auto") return config.launchStatus;
  const target = new Date(config.launchDateTime).getTime();
  if (Number.isNaN(target)) return "pre_launch";
  if (now < target) return "pre_launch";
  if (now < target + celebrationWindowMs(config)) return "launch_day";
  return "post_launch";
}

export type TimeRemaining = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
  isPast: boolean;
};

export function getTimeRemaining(
  launchDateTime: string,
  now: number,
): TimeRemaining {
  const target = new Date(launchDateTime).getTime();
  const total = Math.max(0, (Number.isNaN(target) ? now : target) - now);
  const isPast = now >= target && !Number.isNaN(target);
  return {
    days: Math.floor(total / DAY_MS),
    hours: Math.floor((total / (60 * 60 * 1000)) % 24),
    minutes: Math.floor((total / (60 * 1000)) % 60),
    seconds: Math.floor((total / 1000) % 60),
    total,
    isPast,
  };
}

/** "Saturday, 15 November 2026" rendered in the launch timezone. */
export function formatLaunchDate(config: LaunchConfiguration): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: config.timezone,
    }).format(new Date(config.launchDateTime));
  } catch {
    return "";
  }
}

/** "10:00 AM (Africa/Lagos)" rendered in the launch timezone. */
export function formatLaunchTime(config: LaunchConfiguration): string {
  try {
    const t = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: config.timezone,
    }).format(new Date(config.launchDateTime));
    return `${t} (${config.timezone})`;
  } catch {
    return "";
  }
}

/**
 * Coerce whatever `GET /launch-config` returned into a complete
 * `LaunchConfiguration`. The backend deep-merges PATCH bodies, so an admin who
 * has only ever saved `{launchDateTime}` gets a row missing every other key —
 * without this the countdown would render `undefined`. Nested objects are
 * merged key-by-key rather than replaced wholesale.
 */
export function normalizeLaunchConfig(raw: unknown): LaunchConfiguration {
  const base = DEFAULT_LAUNCH_CONFIG;
  if (!raw || typeof raw !== "object") return { ...base };
  const input = raw as Partial<LaunchConfiguration>;

  const stores = Array.isArray(input.live?.stores) && input.live.stores.length > 0
    ? input.live.stores
    : base.live.stores;

  return {
    ...base,
    ...input,
    launchDateTime:
      typeof input.launchDateTime === "string" &&
      !Number.isNaN(new Date(input.launchDateTime).getTime())
        ? input.launchDateTime
        : base.launchDateTime,
    launchCelebrationDays: Number.isFinite(Number(input.launchCelebrationDays))
      ? Math.min(30, Math.max(0, Number(input.launchCelebrationDays)))
      : base.launchCelebrationDays,
    primaryCTA: { ...base.primaryCTA, ...input.primaryCTA },
    secondaryCTA: { ...base.secondaryCTA, ...input.secondaryCTA },
    ticker: { ...base.ticker, ...input.ticker },
    live: { ...base.live, ...input.live, stores },
  };
}

/** "4 days" / "1 day" / "12 hours" / "48 minutes" — never a bare "0". */
export function humanizeRemaining(remaining: TimeRemaining): string {
  if (remaining.days >= 1) {
    return `${remaining.days} ${remaining.days === 1 ? "day" : "days"}`;
  }
  if (remaining.hours >= 1) {
    return `${remaining.hours} ${remaining.hours === 1 ? "hour" : "hours"}`;
  }
  if (remaining.minutes >= 1) {
    return `${remaining.minutes} ${remaining.minutes === 1 ? "minute" : "minutes"}`;
  }
  return `${remaining.seconds} ${remaining.seconds === 1 ? "second" : "seconds"}`;
}

/** Fill `{days}` in the ticker template with the humanized time remaining. */
export function tickerText(
  config: LaunchConfiguration,
  remaining: TimeRemaining,
): string {
  return config.ticker.text.replace(/\{days\}/g, humanizeRemaining(remaining));
}
