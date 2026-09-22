import { useEffect, useState } from "react";
import { CalendarDays, Clock, Sparkles } from "lucide-react";

import { CountdownCard } from "./countdown-card";
import { LaunchCTA } from "./launch-cta";
import { LaunchBanner } from "./launch-banner";
import { LaunchCeremony } from "./launch-ceremony";
import { useLaunch } from "./launch-state-provider";
import { formatLaunchDate, formatLaunchTime } from "@/lib/launch/config";
import { hasCelebrated, markCelebrated, prefersReducedMotion } from "@/lib/launch/celebrate";

/**
 * The launch section that sits between the trust marquee and
 * "A day with MyTijaara".
 *
 * PRE-LAUNCH  -> badge + headline + live countdown + launch date + CTAs
 *                At T-10s: heightens visual tension for live audience countdown.
 * EXACT ZERO  -> <LaunchCeremony /> (5-phase projector-ready reveal event)
 * LAUNCH DAY  -> <LaunchBanner /> (download the app) once ceremony settles
 * POST-LAUNCH -> nothing at all.
 */
export function LaunchCountdown() {
  const { config, remaining, status, showCountdown, isFinalTenSeconds, ceremonyPreview } = useLaunch();
  const [ceremonyCompleted, setCeremonyCompleted] = useState(false);
  const reducedMotion = prefersReducedMotion();

  // If already celebrated earlier in this session or prior visit, skip ceremony straight to banner
  const alreadyCelebrated = typeof window !== "undefined" && hasCelebrated(config.launchDateTime);

  // Trigger ceremony if:
  // 1. We are in launch_day, ceremony is enabled, and visitor has NOT yet seen ceremony (or in rehearsal preview)
  // 2. OR ceremony preview is active
  const isCeremonyActive =
    (config.ceremony?.enabled !== false &&
      status === "launch_day" &&
      (!alreadyCelebrated || ceremonyPreview === "reveal") &&
      !ceremonyCompleted) ||
    ceremonyPreview === "reveal";

  if (!config.launchEnabled) return null;
  if (status === "post_launch") return null;

  if (isCeremonyActive) {
    return (
      <LaunchCeremony
        isRehearsal={ceremonyPreview === "reveal"}
        onComplete={() => {
          markCelebrated(config.launchDateTime);
          setCeremonyCompleted(true);
        }}
      />
    );
  }

  if (status === "launch_day") return <LaunchBanner />;
  if (!showCountdown) return null;

  const pulseEnabled = config.ceremony?.finalCountdownPulse !== false && !reducedMotion;

  const units = [
    { value: remaining.days, label: "Days" },
    { value: remaining.hours, label: "Hours" },
    { value: remaining.minutes, label: "Minutes" },
    { value: remaining.seconds, label: "Seconds" },
  ];

  return (
    <section
      id="launch"
      aria-labelledby="launch-title"
      className="relative overflow-hidden py-16 sm:py-20"
      data-testid={isFinalTenSeconds ? "final-ten-countdown" : "standard-countdown"}
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div
          className={`relative overflow-hidden rounded-4xl bg-primary-gradient p-6 text-primary-foreground shadow-elegant sm:p-12 transition-all duration-700 ${
            isFinalTenSeconds
              ? "ring-4 ring-gold/60 shadow-[0_0_50px_rgba(201,162,76,0.35)] scale-[1.01]"
              : ""
          }`}
        >
          {/* Ambient lighting - expands dynamically as zero approaches */}
          <div
            className={`pointer-events-none absolute -right-24 -top-24 rounded-full bg-gold blur-3xl transition-all duration-700 ${
              isFinalTenSeconds ? "h-96 w-96 opacity-45" : "h-72 w-72 opacity-25 animate-float-slower"
            }`}
          />
          <div className="pointer-events-none absolute -bottom-28 -left-16 h-72 w-72 animate-float rounded-full bg-primary-foreground/5 blur-3xl" />

          <div className="relative mx-auto max-w-2xl text-center">
            {isFinalTenSeconds ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-gold/60 bg-gold/25 px-5 py-2 text-xs sm:text-sm font-extrabold uppercase tracking-widest text-gold shadow-lg backdrop-blur animate-pulse">
                <Sparkles className="h-4 w-4" />
                Launch Imminent • Final Seconds
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest"
                style={{ animation: "fade-up 0.7s ease-out both" }}
              >
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
                {config.badge}
              </span>
            )}

            <h2
              id="launch-title"
              className={`mt-5 font-display font-bold tracking-tight text-white transition-all ${
                isFinalTenSeconds ? "text-5xl sm:text-6xl text-gold" : "text-4xl sm:text-5xl"
              }`}
              style={{ animation: "fade-up 0.7s ease-out 80ms both" }}
            >
              {isFinalTenSeconds ? "Count Down With Us!" : config.launchTitle}
            </h2>

            <p
              className="mt-4 text-base leading-relaxed text-primary-foreground/85 sm:text-lg"
              style={{ animation: "fade-up 0.7s ease-out 160ms both" }}
            >
              {isFinalTenSeconds
                ? "The moment has arrived. MyTijaara is officially opening across Nigeria."
                : config.launchSubtitle}
            </p>
          </div>

          {/* Countdown */}
          <div
            className={`relative mx-auto mt-10 grid max-w-2xl grid-cols-4 gap-2.5 sm:gap-4 transition-all ${
              isFinalTenSeconds ? "scale-105" : ""
            }`}
            role="timer"
            aria-live="off"
            aria-label={`Time remaining until launch: ${remaining.days} days, ${remaining.hours} hours, ${remaining.minutes} minutes, ${remaining.seconds} seconds`}
          >
            {units.map((u, i) => {
              const isSecondUnit = u.label === "Seconds";
              return (
                <div
                  key={u.label}
                  className={
                    isFinalTenSeconds && isSecondUnit && pulseEnabled
                      ? "ring-4 ring-gold rounded-3xl shadow-glow scale-105 transition-transform"
                      : ""
                  }
                >
                  <CountdownCard
                    value={u.value}
                    label={u.label}
                    delay={220 + i * 70}
                  />
                </div>
              );
            })}
          </div>

          {/* Launch date */}
          <div
            className="relative mx-auto mt-9 flex max-w-2xl flex-col items-center gap-1 text-center"
            style={{ animation: "fade-up 0.7s ease-out 520ms both" }}
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold">
              Official launch date
            </span>
            <p className="flex items-center gap-2 font-display text-lg font-bold sm:text-xl">
              <CalendarDays className="h-4 w-4 text-gold" />
              {formatLaunchDate(config)}
            </p>
            <p className="flex items-center gap-2 text-sm text-primary-foreground/70">
              <Clock className="h-3.5 w-3.5" />
              {formatLaunchTime(config)}
            </p>
          </div>

          {/* CTAs */}
          <div
            className="relative mt-8 flex flex-wrap items-center justify-center gap-3"
            style={{ animation: "fade-up 0.7s ease-out 600ms both" }}
          >
            <LaunchCTA variant="gold" cta={config.primaryCTA} />
            <LaunchCTA variant="secondary" cta={config.secondaryCTA} />
          </div>
        </div>
      </div>
    </section>
  );
}
