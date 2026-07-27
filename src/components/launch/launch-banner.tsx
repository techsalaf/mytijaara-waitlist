import { useEffect, useRef } from "react";
import { Apple, PartyPopper, Play } from "lucide-react";

import { useLaunch } from "./launch-state-provider";

/**
 * Launch-day / post-launch banner. Replaces the countdown once the launch
 * moment passes. Confetti fires at most once per browser session, and never
 * for visitors who prefer reduced motion.
 */
export function LaunchBanner() {
  const { config, status } = useLaunch();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    if (status !== "launch_day" || !config.live.confetti) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (sessionStorage.getItem("mytijaara_launch_confetti") === "1") return;

    fired.current = true;
    sessionStorage.setItem("mytijaara_launch_confetti", "1");

    let cancelled = false;
    import("canvas-confetti").then(({ default: confetti }) => {
      if (cancelled) return;
      const colors = ["#c9a24c", "#1f5c3a", "#f4e4bc"];
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.35 }, colors });
      window.setTimeout(
        () =>
          confetti({
            particleCount: 45,
            spread: 100,
            origin: { y: 0.4 },
            colors,
            scalar: 0.9,
          }),
        260,
      );
    });
    return () => {
      cancelled = true;
    };
  }, [status, config.live.confetti]);

  return (
    <section
      id="download"
      className="relative overflow-hidden bg-primary-gradient py-20 text-primary-foreground sm:py-24"
      aria-labelledby="launch-live-title"
    >
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gold opacity-25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-white/5 blur-3xl" />

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
