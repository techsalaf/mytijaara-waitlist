import { useEffect, useRef, useState } from "react";
import { PartyPopper, Sparkles, X } from "lucide-react";

import { useLaunch } from "./launch-state-provider";
import { celebrateOnce } from "@/lib/launch/celebrate";
import { humanizeRemaining, tickerText } from "@/lib/launch/config";

/**
 * Dismissal is remembered per browser, not per session: a visitor who closes the
 * strip should not have it reappear in the next tab.
 */
const DISMISS_KEY = "mytijaara_ticker_dismissed";

/**
 * The thin animated strip pinned above the nav.
 *
 * PRE-LAUNCH  -> scrolling "N days to go…" marquee, live-updating every second.
 * LAUNCH DAY  -> the celebration ribbon: `ticker.liveText`, gold treatment, and
 *                confetti fired once per visitor.
 * POST-LAUNCH -> `null`. Returns nothing at all, not an empty bar, so the page
 *                collapses back to the plain homepage with no leftover strip and
 *                no leftover whitespace.
 *
 * It renders inside the fixed nav header (above the nav pill) rather than as its
 * own fixed element, so there is nothing to keep in sync when it disappears.
 */
export function LaunchTicker() {
  const { config, remaining, status } = useLaunch();
  const live = status === "launch_day";

  const [dismissed, setDismissed] = useState(false);
  const celebration = useRef<{ stop: () => void } | null>(null);

  // Dismissal is read after mount, never during render: reading localStorage in
  // the initial state would make the server HTML and the first client render
  // disagree, which is exactly the hydration mismatch this page already had.
  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") setDismissed(true);
    } catch {
      /* storage disabled — the strip just stays visible */
    }
  }, []);

  useEffect(() => {
    if (!live || !config.ticker.enabled || !config.ticker.confetti) return;
    const run = celebrateOnce(config.launchDateTime);
    celebration.current = run;
    return () => run.stop();
  }, [live, config.ticker.enabled, config.ticker.confetti, config.launchDateTime]);

  if (!config.launchEnabled) return null;
  if (!config.ticker.enabled) return null;
  if (status === "post_launch") return null;
  if (dismissed) return null;

  const message = live
    ? config.ticker.liveText
    : tickerText(config, remaining);

  // A single strip's worth of content, repeated so the marquee can translate by
  // -50% and land exactly where it started.
  const item = (
    <span className="flex shrink-0 items-center gap-2 px-6" aria-hidden>
      {live ? (
        <PartyPopper className="h-3.5 w-3.5 shrink-0 text-gold" />
      ) : (
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-gold" />
      )}
      <span className="whitespace-nowrap">{message}</span>
      {!live && (
        <span className="rounded-full bg-primary-foreground/15 px-2 py-0.5 font-mono text-[10px] font-bold tabular-nums">
          {String(remaining.hours).padStart(2, "0")}:
          {String(remaining.minutes).padStart(2, "0")}:
          {String(remaining.seconds).padStart(2, "0")}
        </span>
      )}
    </span>
  );

  const Wrapper = config.ticker.href ? "a" : "div";

  return (
    <div
      className={`group relative flex h-8 items-center overflow-hidden text-[11px] font-semibold tracking-wide text-primary-foreground ${
        live ? "bg-gold-gradient text-primary" : "bg-primary-gradient"
      }`}
      data-testid="launch-ticker"
      data-state={live ? "live" : "counting"}
    >
      <Wrapper
        {...(config.ticker.href
          ? {
              href: config.ticker.href,
              "aria-label": message,
            }
          : {})}
        className="flex min-w-0 flex-1 items-center overflow-hidden"
      >
        {/*
          The visible text is duplicated for the seamless loop, so both copies are
          aria-hidden and the real message is exposed once here for assistive tech.
          aria-live is off: a value that changes every second would make a screen
          reader unusable.
        */}
        <span className="sr-only" aria-live="off">
          {live ? message : `${humanizeRemaining(remaining)} until launch. ${message}`}
        </span>
        <div className="animate-ticker flex w-max items-center group-hover:[animation-play-state:paused] motion-reduce:animate-none">
          {item}
          {item}
          {item}
          {item}
        </div>
      </Wrapper>

      <button
        type="button"
        onClick={() => {
          celebration.current?.stop();
          setDismissed(true);
          try {
            localStorage.setItem(DISMISS_KEY, "1");
          } catch {
            /* storage disabled — it will be back on the next load */
          }
        }}
        className="absolute right-0 top-0 grid h-8 w-8 place-items-center bg-gradient-to-l from-black/15 to-transparent transition-colors hover:bg-black/20"
        aria-label="Dismiss launch announcement"
        title="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
