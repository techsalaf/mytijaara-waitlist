import { Reveal } from "@/components/landing/reveal";
import { useCmsData } from "@/lib/cms-context";
import { DEFAULT_LAUNCH_CITY, PHASE_TWO_CITIES, useLaunchCity } from "@/lib/launch/city";
import { Users, Target, Heart, Zap, ShieldCheck, MapPin, Building2, Store, Bike, Award, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";

type Value = { icon?: string; title: string; description?: string; body?: string };
type TeamMember = { name: string; role: string; bio?: string };
type AboutCmsData = {
  hero?: { heading?: string; subheading?: string };
  mission?: { heading?: string; body?: string };
  values?: { heading?: string; items?: Value[] };
  team?: { heading?: string; members?: TeamMember[] };
};

const ICONS = [Users, Target, Heart, Zap, ShieldCheck, Award];

const DEFAULT: AboutCmsData = {
  hero: {
    heading: "We're building the everyday super app Nigeria deserves.",
    subheading:
      "One single platform that unifies daily commerce, meals, groceries, pharmacies, trusted artisans, parcels, and transport — built for how Nigerians live, order, and pay.",
  },
  mission: {
    heading: "Our Mission & Commitment",
    body:
      "MyTijaara exists to eliminate friction from everyday commerce across Nigeria. We believe you shouldn't need five different apps and endless WhatsApp chats to manage your day. From ordering hot lunch to booking an emergency plumber, every transaction should be fast, reliable, transparent, and protected by escrow.",
  },
  values: {
    heading: "What drives everything we build",
    items: [
      {
        title: "Deeply Local, Proudly Nigerian",
        body: "Engineered specifically for Nigerian cities, market streets, and real-world logistics challenges — not an imported copy.",
      },
      {
        title: "100% Escrow Trust",
        body: "Buyers only release payment upon verified delivery; vendors and artisans receive guaranteed, prompt payouts.",
      },
      {
        title: "Empowering Local Micro-Merchants",
        body: "Giving local bukaterias, pharmacy stores, and neighbourhood artisans world-class digital tools to expand their sales.",
      },
      {
        title: "Speed & Real-time Transparency",
        body: "GPS live dispatch, clear naira pricing with zero surprise charges, and responsive 24/7 in-country human support.",
      },
    ],
  },
  team: {
    heading: "Built by a passionate Nigerian team",
    members: [
      { name: "Executive Leadership", role: "Product, Engineering & Operations", bio: "Former founders and operators building infrastructure for everyday African trade." },
      { name: "Merchant Support Network", role: "Merchant & Artisan Operations", bio: "On-the-ground support teams working hand-in-hand with local traders across Nigerian markets." },
      { name: "Logistics Dispatch Fleet", role: "Last-Mile Delivery Network", bio: "Dedicated courier partners ensuring secure, rapid package transport across every mapped zone." },
    ],
  },
};

const STATS = [
  { label: "Planned City Zones", value: "12+", desc: `${DEFAULT_LAUNCH_CITY}, ${PHASE_TWO_CITIES.join(", ")} & more` },
  { label: "Target Delivery Time", value: "< 35 mins", desc: "Express neighborhood dispatch" },
  { label: "Escrow Protection", value: "100%", desc: "Automated payment safety" },
  { label: "Everyday Services", value: "6-in-1", desc: "Food, stores, artisans, parcels & rides" },
];

/**
 * Rollout roadmap. Phase 1 is the launch city and nothing else — see
 * `src/lib/launch/city.ts`. The zone lists are per-city, so they are keyed by
 * name rather than derived.
 */
const CITY_ZONES: Record<string, string> = {
  Ibadan: "Bodija, Ring Road, Jericho, Samonda, Dugbe",
  Lagos: "Ikeja, Lekki, Victoria Island, Yaba, Surulere",
  "Abuja (FCT)": "Maitama, Wuse 2, Garki, Jabi, Gwarinpa",
  "Port Harcourt": "GRA Phase 2, Peter Odili, Trans-Amadi",
};

function useRolloutCities() {
  const launchCity = useLaunchCity();
  return [
    { name: launchCity, status: "Launch Phase 1", zones: CITY_ZONES[launchCity] ?? "Citywide" },
    ...PHASE_TWO_CITIES.filter((c) => c !== launchCity).map((name) => ({
      name,
      status: "Launch Phase 2",
      zones: CITY_ZONES[name] ?? "Citywide",
    })),
  ];
}

export function About() {
  const cms = useCmsData("about", DEFAULT);
  const cities = useRolloutCities();
  // Switched off from Admin -> CMS. `useCmsData` returns null for a disabled
  // section, and the whole page body is this section.
  if (!cms) return null;

  const hero = cms.hero ?? DEFAULT.hero!;
  const mission = cms.mission ?? DEFAULT.mission!;
  const values = cms.values ?? DEFAULT.values!;
  const team = cms.team ?? DEFAULT.team!;

  const valueItems = values.items && values.items.length > 0 ? values.items : DEFAULT.values!.items!;

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-primary-gradient py-24 text-primary-foreground sm:py-32">
        <div className="pointer-events-none absolute -left-40 top-1/2 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-gold opacity-15 blur-3xl" />
        <div className="pointer-events-none absolute -right-40 top-10 h-[400px] w-[400px] rounded-full bg-primary-foreground/10 blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/15 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-gold">
              <Sparkles className="h-3.5 w-3.5" />
              About MyTijaara
            </div>
            <h1 className="mt-5 font-display text-4xl font-extrabold tracking-tight sm:text-6xl">
              {hero.heading}
            </h1>
            {hero.subheading && (
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-primary-foreground/90 sm:text-xl">
                {hero.subheading}
              </p>
            )}
          </Reveal>
        </div>
      </section>

      {/* Impact Stats Strip */}
      <section className="relative -mt-10 mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((stat, i) => (
            <Reveal key={stat.label} delay={i * 60}>
              <div className="rounded-3xl border border-border/80 bg-card p-6 text-center shadow-soft transition-all duration-300 hover:shadow-elegant">
                <div className="font-display text-3xl font-black text-primary">{stat.value}</div>
                <div className="mt-1 text-sm font-bold text-foreground">{stat.label}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{stat.desc}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="bg-background py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <Reveal>
            <div className="rounded-3xl border border-primary/20 bg-primary/5 p-8 sm:p-12 text-center">
              <Badge className="bg-primary text-primary-foreground font-bold mb-3">Our Core Purpose</Badge>
              <h2 className="font-display text-3xl font-bold sm:text-4xl text-foreground">
                {mission.heading}
              </h2>
              <p className="mt-6 text-base sm:text-lg leading-relaxed text-muted-foreground">
                {mission.body}
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Values & Principles */}
      <section className="bg-surface py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal>
            <div className="text-center">
              <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary text-xs font-semibold px-3 py-1">
                Our Values
              </Badge>
              <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl text-foreground">
                {values.heading}
              </h2>
            </div>
          </Reveal>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {valueItems.map((v, i) => {
              const Icon = ICONS[i % ICONS.length];
              const body = v.description ?? v.body ?? "";
              return (
                <Reveal key={v.title} delay={i * 50}>
                  <div className="group h-full rounded-3xl border border-border bg-card p-7 transition-all duration-300 hover:-translate-y-2 hover:border-primary/40 hover:shadow-elegant">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary transition-all duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-6 font-display text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                      {v.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {body}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Coverage & City Expansion Roadmap */}
      <section className="bg-background py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center">
            <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary text-xs font-semibold px-3 py-1">
              Rollout Roadmap
            </Badge>
            <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl text-foreground">
              Starting in {cities[0].name}, then across Nigeria
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground">
              Mapping trusted neighborhood suppliers and artisan networks city by city.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {cities.map((c, i) => (
              <Reveal key={c.name} delay={i * 60}>
                <div className="flex items-start gap-4 rounded-3xl border border-border/70 bg-card p-6 transition-all hover:border-primary/30 hover:shadow-soft">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-700">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-lg font-bold text-foreground">{c.name}</h3>
                      <Badge variant="secondary" className="text-[10px] font-bold">
                        {c.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      <strong className="text-foreground">Key Zones:</strong> {c.zones}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Footer Section */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-primary-gradient px-8 py-12 text-primary-foreground sm:px-16 text-center">
          <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-gold/20 blur-3xl" />
          <h2 className="font-display text-3xl font-extrabold sm:text-4xl">
            Be part of the new way Nigeria trades
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-primary-foreground/90">
            Download the app, order online, or sign up your store or delivery motorcycle today.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to="/download"
              className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-bold text-slate-950 shadow-xl transition-all hover:scale-105 hover:bg-gold"
            >
              Download MyTijaara <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/referral-rewards"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-7 py-3.5 text-sm font-bold text-white transition-all hover:bg-white/20"
            >
              Referral Rewards & Cashbacks
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

