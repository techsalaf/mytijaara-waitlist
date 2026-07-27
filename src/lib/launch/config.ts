/**
 * Launch configuration — the single source of truth for the pre-launch /
 * launch-day / post-launch behaviour of the marketing site.
 *
 * TODAY: `DEFAULT_LAUNCH_CONFIG` below is a placeholder object.
 * LATER:  the backend serves the exact same shape from `GET /launch-config`
 *         (see `src/lib/api/launch.ts`). Nothing else in the app needs to
 *         change — every consumer reads the config through
 *         `useLaunch()` in `src/components/launch/launch-state-provider.tsx`.
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

  badge: string;
  launchTitle: string;
  launchSubtitle: string;

  primaryCTA: LaunchCta;
  secondaryCTA: LaunchCta;

  /** `auto` unless an admin pins a state from the CMS. */
  launchStatus: LaunchStatusSetting;

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
 * Placeholder configuration. Replace the *source* (see `launchApi`), not the
 * shape. Africa/Lagos is UTC+1 year-round, hence the `+01:00` offset.
 */
export const DEFAULT_LAUNCH_CONFIG: LaunchConfiguration = {
  launchEnabled: true,
  countdownEnabled: true,
  waitlistEnabled: true,

  launchDateTime: "2026-11-15T10:00:00+01:00",
  timezone: "Africa/Lagos",

  badge: "🚀 Launching soon",
  launchTitle: "MyTijaara launches in…",
  launchSubtitle:
    "Thousands of Nigerians are already on the waitlist. Join them before launch and be among the first to experience one app for food, shopping, deliveries, and trusted services.",

  primaryCTA: { label: "Join the Waitlist", href: "#waitlist" },
  secondaryCTA: { label: "Learn More", href: "#services" },

  launchStatus: "auto",

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

/** Milliseconds in a day — launch day lasts 24h from the launch moment. */
const DAY_MS = 24 * 60 * 60 * 1000;

/** Derive the effective status. Honours an admin-pinned `launchStatus`. */
export function resolveLaunchStatus(
  config: LaunchConfiguration,
  now: number,
): LaunchStatus {
  if (config.launchStatus !== "auto") return config.launchStatus;
  const target = new Date(config.launchDateTime).getTime();
  if (Number.isNaN(target)) return "pre_launch";
  if (now < target) return "pre_launch";
  if (now < target + DAY_MS) return "launch_day";
  return "post_launch";
}

export type TimeRemaining = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
};

export function getTimeRemaining(
  launchDateTime: string,
  now: number,
): TimeRemaining {
  const target = new Date(launchDateTime).getTime();
  const total = Math.max(0, (Number.isNaN(target) ? now : target) - now);
  return {
    days: Math.floor(total / DAY_MS),
    hours: Math.floor((total / (60 * 60 * 1000)) % 24),
    minutes: Math.floor((total / (60 * 1000)) % 60),
    seconds: Math.floor((total / 1000) % 60),
    total,
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
