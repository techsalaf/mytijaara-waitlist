import { ArrowRight, Check, Sparkles } from "lucide-react";

import { Reveal } from "./reveal";
import { usePrimaryCta } from "@/components/launch/launch-cta";
import { useCmsData } from "@/lib/cms-context";
import { trackEvent } from "@/lib/analytics/track";

type PartnersCmsData = {
  badge?: string;
  heading?: string;
  subheading?: string;
};

const DEFAULT_PARTNERS: PartnersCmsData = {
  badge: "Grow with us",
  heading: "A better way to earn.",
  subheading: "Vendors, riders and artisans — MyTijaara helps you find more customers.",
};

/**
 * These three images used to be imported from `src/assets/screens/*.asset.json`,
 * whose `url` field is a `/__l5e/assets-v1/<uuid>/…` path. That path only exists
 * inside the Lovable editor's dev server, so in production all three 404'd —
 * which is where `screen-vendor-1.png` and `screen-rider-1.png` in the console
 * came from. The real files are committed under `public/screens/` and served
 * from the site root.
 */
export const PARTNER_SCREENS = {
  vendor: "/screens/screen-vendor-1.webp",
  rider: "/screens/screen-rider-1.webp",
  artisans: "/screens/screen-customer-8-artisans.webp",
} as const;

const PARTNERS = [
  {
    tag: "For vendors",
    title: "Grow your shop with MyTijaara.",
    body: "Reach new customers in your area without setting up your own store, app or delivery team.",
    perks: ["New customers, every day", "Simple dashboard on your phone", "Get paid on time"],
    cta: "Join as vendor",
    image: PARTNER_SCREENS.vendor,
    accent: "from-primary/95 via-primary/80 to-primary/40",
  },
  {
    tag: "For riders",
    title: "Earn on your schedule.",
    body: "Deliver food, packages and groceries. Choose when you work, get paid weekly.",
    perks: ["Flexible hours", "Weekly payouts", "In-app support 24/7"],
    cta: "Join as rider",
    image: PARTNER_SCREENS.rider,
    accent: "from-[oklch(0.28_0.08_156)]/95 via-[oklch(0.32_0.09_156)]/75 to-[oklch(0.4_0.1_156)]/30",
  },
  {
    tag: "For artisans",
    title: "Meet more clients — get paid faster.",
    body: "Show off your work, get booked in your area and get paid straight to your account.",
    perks: ["Verified profile", "Bookings that fit your day", "Fair, upfront pricing"],
    cta: "Join as artisan",
    image: PARTNER_SCREENS.artisans,
    accent: "from-[oklch(0.35_0.1_156)]/95 via-[oklch(0.45_0.12_156)]/70 to-gold/25",
  },
];

export function Partners() {
  // Partner CTAs point at the waitlist pre-launch, the download section after.
  const primary = usePrimaryCta();
  const cms = useCmsData("partners", DEFAULT_PARTNERS);
  if (!cms) return null;

  return (
    <section id="partners" className="relative overflow-hidden bg-surface py-24 sm:py-32">
      <div className="pointer-events-none absolute inset-0 bg-hero-gradient opacity-40" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5 text-gold" />
              {cms.badge ?? DEFAULT_PARTNERS.badge}
            </span>
            <h2 className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-5xl">
              {cms.heading ?? DEFAULT_PARTNERS.heading}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {cms.subheading ?? DEFAULT_PARTNERS.subheading}
            </p>
          </Reveal>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-3 lg:gap-7">
          {PARTNERS.map((p, i) => (
            <Reveal key={p.tag} delay={i * 100}>
              <article className="group relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-border bg-card shadow-soft transition-all hover:-translate-y-2 hover:shadow-elegant">
                <div className="relative h-80 overflow-hidden bg-[oklch(0.96_0.01_140)] sm:h-96">
                  <div className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${p.accent} opacity-90`} />
                  <img
                    src={p.image}
                    alt={`${p.tag} screen`}
                    loading="lazy"
                    className="absolute left-1/2 top-8 w-[62%] -translate-x-1/2 select-none drop-shadow-2xl transition-transform duration-700 group-hover:-translate-y-2 group-hover:scale-[1.03]"
                    style={{ transformOrigin: "50% 0%" }}
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-card to-transparent" />
                  <span className="absolute left-5 top-5 inline-flex rounded-full bg-card/95 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary shadow-soft backdrop-blur">
                    {p.tag}
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-7">
                  <h3 className="font-display text-2xl font-bold leading-tight">{p.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
                  <ul className="mt-6 space-y-2.5 border-t border-border pt-6">
                    {p.perks.map((perk) => (
                      <li key={perk} className="flex items-center gap-2.5 text-sm">
                        <span className="grid h-5 w-5 place-items-center rounded-full bg-primary-soft text-primary">
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </span>
                        <span className="text-foreground/85">{perk}</span>
                      </li>
                    ))}
                  </ul>
                  <a
                    href={primary.href}
                    onClick={() => trackEvent("cta_click", { label: p.cta, location: "partners", tag: p.tag })}
                    className="mt-8 inline-flex items-center justify-center gap-2 self-start rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:scale-[1.03] hover:shadow-elegant"
                  >
                    {primary.download ? "Download App" : p.cta}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </a>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
