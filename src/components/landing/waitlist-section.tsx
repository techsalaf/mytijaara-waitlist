import { ArrowRight, Download, Sparkles, Store } from "lucide-react";
import { WaitlistForm } from "./waitlist-form";
import { useLaunch } from "@/components/launch/launch-state-provider";
import { trackEvent } from "@/lib/analytics/track";

/**
 * Waitlist section pre-launch; turns into the permanent app download and
 * merchant partner CTA section once launched or when waitlist is disabled.
 */
export function WaitlistSection() {
  const { showWaitlist } = useLaunch();

  if (!showWaitlist) {
    return (
      <section id="download-cta" className="relative overflow-hidden py-24 sm:py-32">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-4xl bg-primary-gradient p-6 text-primary-foreground shadow-elegant sm:p-16">
            <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-gold opacity-25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-primary-foreground/5 blur-3xl" />

            <div className="relative mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-1.5 text-xs font-semibold">
                <Sparkles className="h-3.5 w-3.5 text-gold" />
                Available Now Across Nigeria
              </span>
              <h2 className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-5xl">
                Start living simpler with MyTijaara.
              </h2>
              <p className="mt-4 text-lg text-primary-foreground/85">
                Food, essentials, vetted artisans, and parcel logistics — all in one place, or directly via WhatsApp.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <a
                  href="/download"
                  onClick={() => trackEvent("cta_click", { label: "Download App", location: "bottom_cta" })}
                  className="group inline-flex items-center gap-2 rounded-full bg-gold-gradient px-8 py-4 text-base font-semibold text-gold-foreground shadow-elegant transition-all hover:scale-[1.02] hover:shadow-glow"
                >
                  <Download className="h-4 w-4" />
                  Download App
                </a>
                <a
                  href="/partners"
                  onClick={() => trackEvent("cta_click", { label: "Become a Partner", location: "bottom_cta" })}
                  className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-8 py-4 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary-foreground/20"
                >
                  <Store className="h-4 w-4" />
                  Partner as Vendor
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="waitlist" className="relative overflow-hidden py-24 sm:py-32">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-4xl bg-primary-gradient p-6 text-primary-foreground shadow-elegant sm:p-16">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-gold opacity-25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-primary-foreground/5 blur-3xl" />

          <div className="relative mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-1.5 text-xs font-semibold">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
              Launching in select cities soon
            </span>
            <h2 className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-5xl">
              Be first to try MyTijaara.
            </h2>
            <p className="mt-4 text-lg text-primary-foreground/85">
              Join thousands of Nigerians on the waitlist — get early access, free delivery
              on your first orders, and updates as we launch in your city.
            </p>

            <WaitlistForm />
          </div>
        </div>
      </div>
    </section>
  );
}
