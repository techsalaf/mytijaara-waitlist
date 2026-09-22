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

export type CeremonyPreviewMode = "none" | "final10" | "reveal";

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
  /** Rehearsal preview mode for event operators: "none" | "final10" | "reveal". */
  ceremonyPreview: CeremonyPreviewMode;
  setCeremonyPreview: (mode: CeremonyPreviewMode) => void;
  /** Final 10 seconds remaining before launch (or in final10 preview mode). */
  isFinalTenSeconds: boolean;
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
  const [ceremonyPreview, setCeremonyPreview] = useState<CeremonyPreviewMode>("none");
  const [simulatedSeconds, setSimulatedSeconds] = useState<number | null>(null);

  // Check URL params for rehearsal preview safely after hydration
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get("ceremony_preview");
      if (mode === "final10" || mode === "reveal") {
        setCeremonyPreview(mode);
      }
    } catch {
      /* ignore */
    }

    const onPreviewEvent = (e: Event) => {
      const detail = (e as CustomEvent<{ mode?: CeremonyPreviewMode }>).detail;
      if (detail?.mode) {
        setCeremonyPreview(detail.mode);
      }
    };
    window.addEventListener("mytijaara:ceremony:preview", onPreviewEvent);
    return () => window.removeEventListener("mytijaara:ceremony:preview", onPreviewEvent);
  }, []);

  // Handle simulated 10-second countdown for rehearsal preview
  useEffect(() => {
    if (ceremonyPreview !== "final10") {
      setSimulatedSeconds(null);
      return;
    }
    setSimulatedSeconds(10);
    const interval = window.setInterval(() => {
      setSimulatedSeconds((s) => {
        if (s === null || s <= 1) {
          window.clearInterval(interval);
          setCeremonyPreview("reveal");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [ceremonyPreview]);

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
    let status = resolveLaunchStatus(config, now);
    let remaining = getTimeRemaining(config.launchDateTime, now);

    if (ceremonyPreview === "reveal") {
      status = "launch_day";
      remaining = { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0, isPast: true };
    } else if (ceremonyPreview === "final10" && simulatedSeconds !== null) {
      status = "pre_launch";
      remaining = {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: simulatedSeconds,
        total: simulatedSeconds * 1000,
        isPast: false,
      };
    }

    const isLaunched = status !== "pre_launch";
    const isFinalTenSeconds =
      ceremonyPreview === "final10" ||
      (status === "pre_launch" && remaining.total > 0 && remaining.total <= 10000);

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
      ceremonyPreview,
      setCeremonyPreview,
      isFinalTenSeconds,
    };
  }, [config, now, ready, ceremonyPreview, simulatedSeconds]);

  return <LaunchContext.Provider value={ctx}>{children}</LaunchContext.Provider>;
}

/**
 * Last-resort context used only when a component reads launch state with no
 * `LaunchStateProvider` above it.
 *
 * It derives `remaining` from `DEFAULT_LAUNCH_CONFIG` instead of hardcoding
 * zeros. The old zeroed version is what rendered "0 seconds to go" in the
 * header ticker on `/about` and `/careers`, because those routes mounted
 * `PublicLayout` (and therefore `Nav` -> `LaunchTicker`) without a provider.
 * The provider now lives inside `PublicLayout`, so this path should be
 * unreachable; deriving the value means that if it is ever reached again the
 * symptom is a slightly stale date rather than a nonsense countdown.
 *
 * `now` is captured once per module evaluation rather than per call so a render
 * pass stays internally consistent. It is a constant, not a clock — nothing
 * ticks without a provider.
 */
const FALLBACK_NOW = Date.now();

function fallbackLaunchContext(): LaunchContextValue {
  const config = DEFAULT_LAUNCH_CONFIG;
  const status = resolveLaunchStatus(config, FALLBACK_NOW);
  const isLaunched = status !== "pre_launch";
  return {
    config,
    status,
    remaining: getTimeRemaining(config.launchDateTime, FALLBACK_NOW),
    now: FALLBACK_NOW,
    isLaunched,
    showCountdown: config.launchEnabled && config.countdownEnabled && !isLaunched,
    showWaitlist: config.waitlistEnabled && !isLaunched,
    ready: false,
    ceremonyPreview: "none",
    setCeremonyPreview: () => {},
    isFinalTenSeconds: false,
  };
}

const DEFAULT_LAUNCH_CONTEXT: LaunchContextValue = fallbackLaunchContext();

export function useLaunch(): LaunchContextValue {
  const ctx = useContext(LaunchContext);
  return ctx ?? DEFAULT_LAUNCH_CONTEXT;
}
