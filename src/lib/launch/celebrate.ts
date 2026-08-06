/**
 * Launch-day celebration.
 *
 * The old version fired two small bursts (70 then 45 particles) from the middle
 * of the viewport and stopped, which read as a glitch rather than a celebration.
 * This runs a real sequence: an opening burst, then two side cannons streaming
 * for a fixed duration, then a slow gold drift from the top edge.
 *
 * Everything here is deliberately pure or injectable so the gate tests can drive
 * it without a canvas: `canvas-confetti` is dynamically imported (it touches
 * `document` at module scope), the clock comes from `setTimeout`, and the
 * "already celebrated" bookkeeping is plain localStorage behind named helpers.
 */

/** Brand palette: green, gold, cream. Same three used by the launch banner. */
export const CELEBRATION_COLORS = ["#1f5c3a", "#c9a24c", "#f4e4bc", "#2e7d51"];

/** How long the side cannons keep streaming. */
const STREAM_MS = 2200;
/** Gap between cannon volleys. */
const STREAM_TICK_MS = 180;

type ConfettiFn = (options: Record<string, unknown>) => unknown;

/**
 * `true` when the visitor asked the OS to reduce motion. Confetti is decoration,
 * so it is skipped entirely rather than shortened.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Storage key for "this visitor has already seen the celebration".
 *
 * It carries the launch instant, so moving the launch date from the CMS gives
 * every visitor one fresh celebration instead of silently never firing again.
 */
export function celebrationKey(launchDateTime: string): string {
  return `mytijaara_celebrated:${launchDateTime}`;
}

/**
 * First-time check. Uses localStorage, not sessionStorage: the brief asks for
 * the ribbon celebration to fire "for first-time visitors only", which a
 * per-session key cannot express — a new tab would re-fire it.
 */
export function hasCelebrated(launchDateTime: string): boolean {
  try {
    return localStorage.getItem(celebrationKey(launchDateTime)) === "1";
  } catch {
    // Private mode / storage disabled. Treat as "not yet" and let the celebration
    // run; the worst case is it fires again on the next load.
    return false;
  }
}

export function markCelebrated(launchDateTime: string): void {
  try {
    localStorage.setItem(celebrationKey(launchDateTime), "1");
  } catch {
    /* storage disabled — nothing to remember with */
  }
}

/** Loader seam so tests can supply a fake instead of the real canvas library. */
let loadConfetti: () => Promise<ConfettiFn> = async () => {
  const mod = await import("canvas-confetti");
  return mod.default as unknown as ConfettiFn;
};

/** Test hook. Pass `null` to restore the real dynamic import. */
export function __setConfettiLoader(
  loader: (() => Promise<ConfettiFn>) | null,
): void {
  loadConfetti = loader
    ? loader
    : async () => {
        const mod = await import("canvas-confetti");
        return mod.default as unknown as ConfettiFn;
      };
}

/**
 * Run the celebration.
 *
 * Returns `false` when it deliberately did nothing (reduced motion, or no
 * window), so callers can avoid recording a celebration that never happened.
 * The returned cleanup stops any pending volleys, which matters because the
 * ribbon can unmount mid-sequence when the celebration window closes.
 */
export type Celebration = { started: boolean; stop: () => void };

export function celebrate(): Celebration {
  if (typeof window === "undefined") return { started: false, stop: () => {} };
  if (prefersReducedMotion()) return { started: false, stop: () => {} };

  let cancelled = false;
  const timers: number[] = [];
  const after = (ms: number, fn: () => void) => {
    timers.push(window.setTimeout(fn, ms));
  };

  void loadConfetti()
    .then((confetti) => {
      if (cancelled) return;

      // 1. Opening burst, wide and slightly above centre so it reads from the
      //    ribbon downward rather than from nowhere.
      confetti({
        particleCount: 140,
        spread: 100,
        startVelocity: 45,
        origin: { x: 0.5, y: 0.18 },
        colors: CELEBRATION_COLORS,
        ticks: 260,
        scalar: 1.05,
        disableForReducedMotion: true,
      });

      // 2. Side cannons. Two low-angle streams from the bottom corners for
      //    STREAM_MS, which is what makes it feel continuous instead of a pop.
      const volleys = Math.floor(STREAM_MS / STREAM_TICK_MS);
      for (let i = 0; i < volleys; i += 1) {
        after(i * STREAM_TICK_MS, () => {
          if (cancelled) return;
          // Taper off so the tail feels like an ending, not a cut.
          const remaining = 1 - i / volleys;
          const particleCount = Math.max(6, Math.round(26 * remaining));
          confetti({
            particleCount,
            angle: 62,
            spread: 58,
            startVelocity: 52,
            origin: { x: 0, y: 0.92 },
            colors: CELEBRATION_COLORS,
            disableForReducedMotion: true,
          });
          confetti({
            particleCount,
            angle: 118,
            spread: 58,
            startVelocity: 52,
            origin: { x: 1, y: 0.92 },
            colors: CELEBRATION_COLORS,
            disableForReducedMotion: true,
          });
        });
      }

      // 3. Slow gold drift from the top edge, wide and low-gravity, so the
      //    screen settles instead of going abruptly quiet.
      after(420, () => {
        if (cancelled) return;
        confetti({
          particleCount: 60,
          spread: 140,
          startVelocity: 12,
          gravity: 0.45,
          decay: 0.94,
          scalar: 1.25,
          origin: { x: 0.5, y: 0 },
          colors: ["#c9a24c", "#f4e4bc"],
          disableForReducedMotion: true,
        });
      });
    })
    .catch(() => {
      /* confetti chunk failed to load — the page is still fine without it */
    });

  return {
    started: true,
    stop: () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
      timers.length = 0;
    },
  };
}

/**
 * Celebrate once per visitor for a given launch instant.
 *
 * Returns the cleanup plus whether it actually ran, so a caller does not have to
 * duplicate the first-time bookkeeping.
 */
export function celebrateOnce(launchDateTime: string): Celebration {
  if (hasCelebrated(launchDateTime)) return { started: false, stop: () => {} };
  const run = celebrate();
  // Only remember it when it really fired: a reduced-motion visitor who later
  // turns the setting off should still get their one celebration.
  if (run.started) markCelebrated(launchDateTime);
  return run;
}
