import {
  UtensilsCrossed,
  ShoppingBasket,
  Pill,
  Package,
  Car,
  Wrench,
  ArrowRight,
  Download,
  Star,
} from "lucide-react";

import { Reveal } from "./reveal";
import { WaitlistCount } from "./waitlist-count";
import { AvatarCluster } from "./avatar-cluster";
import { usePrimaryCta } from "@/components/launch/launch-cta";
import { useLaunch } from "@/components/launch/launch-state-provider";
import { useCmsData } from "@/lib/cms-context";
import heroImg from "@/assets/hero-illustration.png";
import { trackEvent } from "@/lib/analytics/track";

type HeroService = { icon: string; label: string };

type HeroCmsData = {
  eyebrow?: string;
  /**
   * Eyebrow shown once the launch date has passed. Seeded from day one and, until
   * now, read from the bundled constant instead of the section, so editing it in
   * the admin panel changed nothing after launch day.
   */
  eyebrowLive?: string;
  heading?: string;
  headingHighlight?: string;
  subtitle?: string;
  imageUrl?: string;
  secondaryCtaLabel?: string;
  services?: HeroService[];
};

const DEFAULT_HERO: HeroCmsData = {
  eyebrow: "Built for Nigerians — Launching soon",
  eyebrowLive: "Built for Nigerians — Now live",
  heading: "Everything you need,",
  headingHighlight: "all in one place.",
  subtitle:
    "Order food, groceries and pharmacy items, book trusted artisans, send packages, rent cars, and shop from businesses around you — all from one app built for Nigerians.",
  imageUrl: "",
  secondaryCtaLabel: "See How It Works",
  services: [],
};

// Lucide icon lookup so service chip icons can be stored as strings in the DB.
const SERVICE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  UtensilsCrossed,
  ShoppingBasket,
  Pill,
  Package,
  Car,
  Wrench,
};

const DEFAULT_SERVICES = [
  { icon: "UtensilsCrossed", label: "Food" },
  { icon: "ShoppingBasket", label: "Groceries" },
  { icon: "Pill", label: "Pharmacy" },
  { icon: "Package", label: "Parcels" },
  { icon: "Car", label: "Cars" },
  { icon: "Wrench", label: "Artisans" },
];

export function Hero() {
  const cta = usePrimaryCta();
  const { isLaunched, showWaitlist } = useLaunch();
  const CtaIcon = cta.download ? Download : ArrowRight;
  const cms = useCmsData("hero", DEFAULT_HERO as HeroCmsData);

  if (!cms) return null;

  // Both eyebrows come from the section. The launched variant used to be read
  // off `DEFAULT_HERO`, which made the admin field for it inert after launch.
  const eyebrow = isLaunched
    ? cms.eyebrowLive || DEFAULT_HERO.eyebrowLive!
    : cms.eyebrow || DEFAULT_HERO.eyebrow!;

  const heading = cms.heading || DEFAULT_HERO.heading!;
  const headingHighlight = cms.headingHighlight || DEFAULT_HERO.headingHighlight!;
  const subtitle = cms.subtitle || DEFAULT_HERO.subtitle!;
  const secondaryCtaLabel = cms.secondaryCtaLabel || DEFAULT_HERO.secondaryCtaLabel!;
  const heroImage = cms.imageUrl || heroImg;
  const services = (cms.services && cms.services.length > 0) ? cms.services : DEFAULT_SERVICES;

  return (
    <section id="top" className="relative overflow-hidden pt-32 pb-20 sm:pt-40 lg:pb-32">
      <div className="pointer-events-none absolute inset-0 bg-hero-gradient" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[600px] bg-[radial-gradient(circle_at_50%_0%,color-mix(in_oklab,var(--gold)_18%,transparent),transparent_60%)]" />

      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-8">
        <div className="flex flex-col justify-center">
          <Reveal>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/15 bg-primary-soft px-4 py-1.5 text-xs font-semibold text-primary">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
              {eyebrow}
            </span>
          </Reveal>
          <Reveal delay={100}>
            <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              {heading}{" "}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-primary via-primary to-[oklch(0.5_0.13_150)] bg-clip-text text-transparent">
                  {headingHighlight}
                </span>
                <svg
                  aria-hidden
                  className="absolute -bottom-2 left-0 h-3 w-full"
                  viewBox="0 0 300 12"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M2 8 Q75 2 150 6 T298 4"
                    fill="none"
                    stroke="url(#u)"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="u" x1="0" x2="1">
                      <stop offset="0" stopColor="oklch(0.78 0.13 82)" />
                      <stop offset="1" stopColor="oklch(0.36 0.09 156)" />
                    </linearGradient>
                  </defs>
                </svg>
              </span>
            </h1>
          </Reveal>
          <Reveal delay={200}>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              {subtitle}
            </p>
          </Reveal>
          <Reveal delay={300}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href={cta.href}
                onClick={() => trackEvent("cta_click", { label: cta.label, location: "hero_primary" })}
                className="group inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-7 py-4 text-base font-semibold text-primary-foreground shadow-elegant transition-all hover:scale-[1.02] hover:shadow-glow"
              >
                {cta.label}
                <CtaIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <a
                href="#how"
                onClick={() => trackEvent("cta_click", { label: secondaryCtaLabel, location: "hero_secondary" })}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-card px-7 py-4 text-base font-semibold text-foreground transition-colors hover:bg-primary-soft"
              >
                {secondaryCtaLabel}
              </a>
            </div>
          </Reveal>
          <Reveal delay={400}>
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
              <AvatarCluster />
              <span>
                {showWaitlist ? (
                  <WaitlistCount />
                ) : (
                  <>
                    <strong className="text-foreground">Thousands</strong> of Nigerians
                    already using MyTijaara
                  </>
                )}
              </span>
              <div className="flex items-center gap-1 text-gold">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
            </div>
          </Reveal>
        </div>

        {/* Hero visual */}
        <Reveal delay={200}>
          <div className="relative mx-auto h-[520px] w-full max-w-md sm:h-[600px]">
            <div className="absolute inset-0 rounded-[3rem] bg-primary-gradient opacity-[0.06] blur-3xl" />
            <div className="absolute left-1/2 top-1/2 h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-gradient opacity-30 blur-3xl" />

            <img
              src={typeof heroImage === "string" ? heroImage : (heroImage as { src?: string }).src ?? ""}
              alt="A young Nigerian woman using the MyTijaara app"
              width={1200}
              height={1200}
              className="relative z-10 h-full w-full object-contain drop-shadow-2xl"
              fetchPriority="high"
            />

            {/* Floating cards */}
            <div className="absolute left-0 top-16 z-20 animate-float">
              <div className="glass rounded-2xl px-4 py-3 shadow-soft">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
                    <UtensilsCrossed className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Jollof rice + plantain</p>
                    <p className="text-sm font-semibold">Arriving in 22 min</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute right-0 top-40 z-20 animate-float-slower">
              <div className="glass rounded-2xl px-4 py-3 shadow-soft">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-gold-gradient text-gold-foreground">
                    <Wrench className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Electrician booked</p>
                    <p className="text-sm font-semibold">Tomorrow, 10am</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute bottom-8 left-4 z-20 animate-float">
              <div className="glass rounded-2xl px-4 py-3 shadow-soft">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Parcel to Lekki</p>
                    <p className="text-sm font-semibold">Picked up ✓</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>

      {/* Service chips */}
      <div className="relative mx-auto mt-16 max-w-6xl px-4 sm:px-6">
        <Reveal delay={200}>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {services.map(({ icon, label }) => {
              const Icon = SERVICE_ICONS[icon];
              return (
                <div
                  key={label}
                  className="group flex flex-col items-center gap-2 rounded-2xl border border-border bg-card px-3 py-4 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-soft"
                >
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    {Icon ? <Icon className="h-5 w-5" /> : null}
                  </div>
                  <span className="text-xs font-semibold text-foreground">{label}</span>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
