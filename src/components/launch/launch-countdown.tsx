import { CalendarDays, Clock } from "lucide-react";

import { CountdownCard } from "./countdown-card";
import { LaunchCTA } from "./launch-cta";
import { LaunchBanner } from "./launch-banner";
import { useLaunch } from "./launch-state-provider";
import { formatLaunchDate, formatLaunchTime } from "@/lib/launch/config";

/**
 * The launch section that sits between the trust marquee and
 * "A day with MyTijaara".
 *
 * PRE-LAUNCH  -> badge + headline + live countdown + launch date + CTAs
 * LAUNCH DAY / POST-LAUNCH -> <LaunchBanner /> (download the app)
 * launchEnabled = false -> renders nothing at all, no empty space.
 */
export function LaunchCountdown() {
  const { config, remaining, isLaunched, showCountdown } = useLaunch();

  if (!config.launchEnabled) return null;
  if (isLaunched) return <LaunchBanner />;
  if (!showCountdown) return null;

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
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-4xl bg-primary-gradient p-6 text-primary-foreground shadow-elegant sm:p-12">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 animate-float-slower rounded-full bg-gold opacity-25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -left-16 h-72 w-72 animate-float rounded-full bg-primary-foreground/5 blur-3xl" />

          <div className="relative mx-auto max-w-2xl text-center">
            <span
              className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest"
              style={{ animation: "fade-up 0.7s ease-out both" }}
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
              {config.badge}
            </span>

            <h2
              id="launch-title"
              className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-5xl"
              style={{ animation: "fade-up 0.7s ease-out 80ms both" }}
            >
              {config.launchTitle}
            </h2>

            <p
              className="mt-4 text-base leading-relaxed text-primary-foreground/85 sm:text-lg"
              style={{ animation: "fade-up 0.7s ease-out 160ms both" }}
            >
              {config.launchSubtitle}
            </p>
          </div>

          {/* Countdown */}
          <div
            className="relative mx-auto mt-10 grid max-w-2xl grid-cols-4 gap-2.5 sm:gap-4"
            role="timer"
            aria-live="off"
            aria-label={`Time remaining until launch: ${remaining.days} days, ${remaining.hours} hours, ${remaining.minutes} minutes, ${remaining.seconds} seconds`}
          >
            {units.map((u, i) => (
              <CountdownCard
                key={u.label}
                value={u.value}
                label={u.label}
                delay={220 + i * 70}
              />
            ))}
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
