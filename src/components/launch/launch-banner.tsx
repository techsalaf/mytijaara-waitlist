import { useEffect } from "react";
import { Apple, PartyPopper, Play } from "lucide-react";

import { useLaunch } from "./launch-state-provider";
import { celebrate, celebrateOnce } from "@/lib/launch/celebrate";

/**
 * Launch-day / post-launch banner. Replaces the countdown once the launch
 * moment passes.
 *
 * The celebration itself lives in src/lib/launch/celebrate.ts and is shared with
 * the ticker, which is why `celebrateOnce` is safe to call from both: the first
 * one to run records the visitor and the second becomes a no-op, so a launch-day
 * visitor never gets two overlapping confetti sequences.
 */
export function LaunchBanner() {
  const { config, status } = useLaunch();

  useEffect(() => {
    if (status !== "launch_day" || !config.live.confetti) return;
    const run = celebrateOnce(config.launchDateTime);
    return () => run.stop();
  }, [status, config.live.confetti, config.launchDateTime]);

  return (
    <section
      id="download"
      className="relative overflow-hidden bg-primary-gradient py-20 text-primary-foreground sm:py-24"
      aria-labelledby="launch-live-title"
    >
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gold opacity-25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-primary-foreground/5 blur-3xl" />

      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-1.5 text-xs font-semibold">
          <PartyPopper className="h-3.5 w-3.5 text-gold" />
          {config.live.badge}
        </span>
        <h2
          id="launch-live-title"
          className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-5xl"
        >
          {config.live.title}
        </h2>
        <p className="mt-4 text-lg text-primary-foreground/85">
          {config.live.subtitle}
        </p>

        {/*
          The celebration is interactive, not just an on-load effect: a visitor
          who arrives after their one automatic run (or with reduced motion since
          turned off) can still fire it deliberately.
        */}
        <button
          type="button"
          onClick={() => celebrate()}
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/15 px-4 py-2 text-xs font-bold uppercase tracking-widest text-gold transition-transform hover:scale-105 active:scale-95"
        >
          <PartyPopper className="h-3.5 w-3.5" />
          Celebrate with us
        </button>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          {config.live.stores.map((store) => {
            const Icon = store.platform === "ios" ? Apple : Play;
            const disabled = !!store.comingSoon;
            return (
              <a
                key={store.platform}
                href={disabled ? undefined : store.href}
                aria-disabled={disabled}
                target={disabled ? undefined : "_blank"}
                rel="noreferrer"
                className={`inline-flex items-center gap-3 rounded-2xl border border-primary-foreground/20 px-5 py-3 text-left transition-all ${
                  disabled
                    ? "cursor-not-allowed bg-primary-foreground/[0.06] opacity-60"
                    : "bg-primary-foreground/10 hover:-translate-y-0.5 hover:bg-primary-foreground/20"
                }`}
              >
                <Icon className="h-6 w-6" />
                <span>
                  <span className="block text-[10px] uppercase tracking-widest text-primary-foreground/60">
                    {store.sublabel}
                  </span>
                  <span className="block text-sm font-bold">{store.label}</span>
                </span>
                {disabled && (
                  <span className="ml-1 rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold">
                    Soon
                  </span>
                )}
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
