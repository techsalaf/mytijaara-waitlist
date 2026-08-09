import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { launchApi } from "@/lib/api";
import {
  DEFAULT_LAUNCH_CONFIG,
  getTimeRemaining,
  resolveLaunchStatus,
  type LaunchConfiguration,
  type LaunchStatus,
  type TimeRemaining,
} from "@/lib/launch/config";

type LaunchContextValue = {
  config: LaunchConfiguration;
  /** Effective state right now — recomputed every tick. */
  status: LaunchStatus;
  remaining: TimeRemaining;
  /**
   * The clock the whole page renders from. Seeded from the SSR loader, so
   * anything date-derived (the countdown digits, the footer's copyright year)
   * renders the same on the server and on the client's first paint.
   */
  now: number;
  /** Launch moment reached (launch day or later). */
  isLaunched: boolean;
  /** Render the countdown section? */
  showCountdown: boolean;
  /** Render the waitlist section / waitlist CTAs? */
  showWaitlist: boolean;
  /** Config has been fetched (false during the first paint). */
  ready: boolean;
};

const LaunchContext = createContext<LaunchContextValue | null>(null);

/**
 * Holds launch CMS config + a 1s clock. Everything launch-aware on the page
 * (countdown, nav CTA, hero CTA, waitlist visibility) reads from here so a
 * single backend response can flip the whole site from pre-launch to
 * production mode with no code change.
 */
export function LaunchStateProvider({
  children,
  /** Test/story override — skips the API read. */
  value,
  /**
   * Config resolved in the route's SSR loader. When present the first painted
   * HTML already carries the admin-configured date, so there is no flash of the
   * placeholder date and no client fetch on mount.
   */
  initialConfig,
  /**
   * The clock reading taken on the server, from the same loader. The countdown
   * digits are text derived from `now`, so seeding it with a fresh `Date.now()`
   * during render made the server HTML and the first client render disagree by
   * however long the response took — a text hydration mismatch (React #418) on
   * every load. Both sides now render this one number, and the real clock takes
   * over in an effect after hydration.
   */
  initialNow,
}: {
  children: ReactNode;
  value?: Partial<LaunchConfiguration>;
  initialConfig?: LaunchConfiguration;
  initialNow?: number;
}) {
  const seeded = !!value || !!initialConfig;
  const [config, setConfig] = useState<LaunchConfiguration>(() => ({
    ...DEFAULT_LAUNCH_CONFIG,
    ...initialConfig,
    ...value,
  }));
  const [ready, setReady] = useState(seeded);
  const [now, setNow] = useState(() => initialNow ?? Date.now());


  useEffect(() => {
    if (seeded) return;
    let cancelled = false;
    launchApi
      .get()
      .then((cfg) => {
        if (cancelled) return;
        setConfig(cfg);
      })
      .catch(() => {
        /* keep the placeholder config */
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [seeded]);

  useEffect(() => {
    // Sync once immediately: `initialNow` came from the server, so it is behind
    // by however long the response and hydration took. This runs after
    // hydration, so correcting the digits here cannot produce a mismatch.
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const ctx = useMemo<LaunchContextValue>(() => {
    const status = resolveLaunchStatus(config, now);
    const remaining = getTimeRemaining(config.launchDateTime, now);
    const isLaunched = status !== "pre_launch";
    return {
      config,
      status,
      remaining,
      now,
      isLaunched,
      showCountdown:
        config.launchEnabled && config.countdownEnabled && !isLaunched,
      showWaitlist: config.waitlistEnabled && !isLaunched,
      ready,
    };
  }, [config, now, ready]);

  return <LaunchContext.Provider value={ctx}>{children}</LaunchContext.Provider>;
}

const DEFAULT_LAUNCH_CONTEXT: LaunchContextValue = {
  config: DEFAULT_LAUNCH_CONFIG,
  status: "pre_launch",
  remaining: { days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, isPast: false },
  now: Date.now(),
  isLaunched: false,
  showCountdown: true,
  showWaitlist: true,
  ready: true,
};

export function useLaunch(): LaunchContextValue {
  const ctx = useContext(LaunchContext);
  return ctx ?? DEFAULT_LAUNCH_CONTEXT;
}
