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
}: {
  children: ReactNode;
  value?: Partial<LaunchConfiguration>;
}) {
  const [config, setConfig] = useState<LaunchConfiguration>({
    ...DEFAULT_LAUNCH_CONFIG,
    ...value,
  });
  const [ready, setReady] = useState(!!value);
  // SSR-stable seed: the first client render matches the server render, then
  // the interval takes over. Avoids a hydration mismatch on the digits.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (value) return;
    let cancelled = false;
    launchApi
      .get()
      .then((r) => {
        if (cancelled) return;
        setConfig(r.data);
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
  }, [value]);

  useEffect(() => {
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
      isLaunched,
      showCountdown:
        config.launchEnabled && config.countdownEnabled && !isLaunched,
      showWaitlist: config.waitlistEnabled && !isLaunched,
      ready,
    };
  }, [config, now, ready]);

  return <LaunchContext.Provider value={ctx}>{children}</LaunchContext.Provider>;
}

export function useLaunch(): LaunchContextValue {
  const ctx = useContext(LaunchContext);
  if (!ctx) {
    throw new Error("useLaunch must be used inside <LaunchStateProvider>");
  }
  return ctx;
}
