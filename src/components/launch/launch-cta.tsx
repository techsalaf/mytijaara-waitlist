import { ArrowRight, Download } from "lucide-react";

import { useLaunch } from "./launch-state-provider";
import type { LaunchCta } from "@/lib/launch/config";
import { trackEvent } from "@/lib/analytics/track";

/**
 * The launch-aware primary call to action.
 *
 * Pre-launch  -> the configured primary CTA ("Join the Waitlist").
 * Post-launch -> automatically becomes "Download App" pointing at the
 *                live section. Nav, hero and partner cards all use this so
 *                the whole site flips with one backend flag.
 */
export function usePrimaryCta(): LaunchCta & { download: boolean } {
  const { config, isLaunched, showWaitlist } = useLaunch();

  if (isLaunched || !showWaitlist) {
    return { label: "Download App", href: "/download", download: true };
  }
  return { ...config.primaryCTA, download: false };
}

export function LaunchCTA({
  variant = "primary",
  cta,
  label: labelOverride,
  trackLabel,
  className = "",
}: {
  variant?: "primary" | "secondary" | "gold";
  cta: LaunchCta & { download?: boolean };
  label?: string;
  trackLabel?: string;
  className?: string;
}) {
  if (cta.hidden) return null;

  const base =
    "group inline-flex items-center justify-center gap-2 rounded-full px-7 py-4 text-base font-semibold transition-all hover:scale-[1.02]";
  const styles = {
    primary:
      "bg-primary text-primary-foreground shadow-elegant hover:shadow-glow",
    gold: "bg-gold-gradient text-gold-foreground shadow-elegant hover:shadow-glow",
    secondary:
      "border border-primary-foreground/25 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20",
  }[variant];

  const Icon = cta.download ? Download : ArrowRight;
  const displayLabel = labelOverride ?? cta.label;

  return (
    <a
      href={cta.href}
      className={`${base} ${styles} ${className}`}
      onClick={() => trackEvent("cta_click", { label: trackLabel ?? displayLabel, href: cta.href })}
    >
      {displayLabel}
      <Icon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
    </a>
  );
}
