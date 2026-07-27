import { WaitlistForm } from "./waitlist-form";
import { useLaunch } from "@/components/launch/launch-state-provider";

/**
 * Waitlist section. Disappears entirely when `waitlistEnabled` is false or
 * once the app has launched — the sections above/below close the gap because
 * all vertical rhythm lives on the sections themselves, not on wrappers.
 */
export function WaitlistSection() {
  const { showWaitlist } = useLaunch();
  if (!showWaitlist) return null;

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
