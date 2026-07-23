import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  UtensilsCrossed, ShoppingBasket, Pill, Store, Package, Car, Wrench,
  ArrowRight, Check, Star, MapPin, Clock, Shield, Sparkles, Menu, X,
  Sun, Sunset, Moon, Coffee, ChevronDown, Facebook, Instagram, Twitter,
} from "lucide-react";

import heroImg from "@/assets/hero-illustration.png";
import morningImg from "@/assets/moment-morning.jpg";
import afternoonImg from "@/assets/moment-afternoon.jpg";
import eveningImg from "@/assets/moment-evening.jpg";
import nightImg from "@/assets/moment-night.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MyTijaara — Everything you need, all in one place" },
      {
        name: "description",
        content:
          "Order food, groceries and pharmacy items, book trusted artisans, send packages, rent cars and shop from businesses around you — all from one app built for Nigerians.",
      },
      { property: "og:title", content: "MyTijaara — Everything you need, all in one place" },
      {
        property: "og:description",
        content:
          "Order food, groceries and pharmacy items, book trusted artisans, send packages, rent cars and shop from businesses around you — all from one app built for Nigerians.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "MyTijaara — Everything you need, all in one place" },
      {
        name: "twitter:description",
        content: "Order food, groceries and pharmacy items, book trusted artisans, send packages, rent cars and shop from businesses around you — all from one app built for Nigerians.",
      },
    ],
  }),
  component: Landing,
});

/* ---------- reusable bits ---------- */

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && (setShown(true), io.disconnect()),
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.8s ease-out ${delay}ms, transform 0.8s ease-out ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-primary-gradient shadow-soft">
        <span className="font-display text-lg font-bold text-primary-foreground">M</span>
        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-gold-gradient ring-2 ring-background" />
      </div>
      <span className="font-display text-xl font-bold tracking-tight">MyTijaara</span>
    </div>
  );
}

/* ---------- nav ---------- */

function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const links = [
    { href: "#moments", label: "Everyday moments" },
    { href: "#services", label: "What you can do" },
    { href: "#how", label: "How it works" },
    { href: "#partners", label: "For partners" },
    { href: "#faq", label: "FAQ" },
  ];
  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all ${
        scrolled ? "py-2" : "py-4"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div
          className={`flex items-center justify-between rounded-2xl px-4 py-3 transition-all ${
            scrolled ? "glass shadow-soft" : ""
          }`}
        >
          <a href="#top" aria-label="MyTijaara home">
            <Logo />
          </a>
          <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm font-medium text-foreground/75 transition-colors hover:text-foreground"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <a
              href="#waitlist"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-transform hover:scale-[1.03]"
            >
              Join the waitlist
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <button
            className="grid h-11 w-11 place-items-center rounded-xl border border-border md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {open && (
          <div className="mt-2 rounded-2xl glass p-4 shadow-soft md:hidden">
            <nav className="flex flex-col gap-1" aria-label="Mobile">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/80 hover:bg-primary-soft"
                >
                  {l.label}
                </a>
              ))}
              <a
                href="#waitlist"
                onClick={() => setOpen(false)}
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
              >
                Join the waitlist <ArrowRight className="h-4 w-4" />
              </a>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

/* ---------- hero ---------- */

const HERO_SERVICES = [
  { icon: UtensilsCrossed, label: "Food" },
  { icon: ShoppingBasket, label: "Groceries" },
  { icon: Pill, label: "Pharmacy" },
  { icon: Package, label: "Parcels" },
  { icon: Car, label: "Cars" },
  { icon: Wrench, label: "Artisans" },
];

function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pt-32 pb-20 sm:pt-40 lg:pb-32">
      <div className="pointer-events-none absolute inset-0 bg-hero-gradient" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[600px] bg-[radial-gradient(circle_at_50%_0%,color-mix(in_oklab,var(--gold)_18%,transparent),transparent_60%)]" />

      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-8">
        <div className="flex flex-col justify-center">
          <Reveal>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/15 bg-primary-soft px-4 py-1.5 text-xs font-semibold text-primary">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
              Built for Nigerians — Launching soon
            </span>
          </Reveal>
          <Reveal delay={100}>
            <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              Everything you need,{" "}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-primary via-primary to-[oklch(0.5_0.13_150)] bg-clip-text text-transparent">
                  all in one place.
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
              Order food, groceries and pharmacy items, book trusted artisans, send
              packages, rent cars, and shop from businesses around you — all from one
              app built for Nigerians.
            </p>
          </Reveal>
          <Reveal delay={300}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#waitlist"
                className="group inline-flex items-center gap-2 rounded-full bg-primary px-7 py-4 text-base font-semibold text-primary-foreground shadow-elegant transition-all hover:scale-[1.02] hover:shadow-glow"
              >
                Join the Waitlist
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <a
                href="#how"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-7 py-4 text-base font-semibold text-foreground transition-colors hover:bg-primary-soft"
              >
                See How It Works
              </a>
            </div>
          </Reveal>
          <Reveal delay={400}>
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
              <div className="flex -space-x-2">
                {["#1f5c3a", "#c9a24c", "#2d7a4f", "#8b5a2b"].map((c, i) => (
                  <div
                    key={i}
                    className="h-8 w-8 rounded-full ring-2 ring-background"
                    style={{ background: c }}
                    aria-hidden
                  />
                ))}
              </div>
              <span>
                <strong className="text-foreground">2,400+</strong> Nigerians already on the waitlist
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
              src={heroImg}
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
            {HERO_SERVICES.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="group flex flex-col items-center gap-2 rounded-2xl border border-border bg-card px-3 py-4 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-soft"
              >
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold text-foreground">{label}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- trusted by ---------- */

function TrustedBy() {
  const items = [
    "Local Restaurants", "Trusted Pharmacies", "Verified Artisans",
    "Supermarkets", "Delivery Riders", "Car Rentals", "Neighborhood Shops",
  ];
  return (
    <section aria-label="Coming soon partners" className="border-y border-border/60 bg-surface py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-5 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-gold" />
          Bringing together — coming soon
        </div>
        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-surface to-transparent z-10" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-surface to-transparent z-10" />
          <div className="flex w-max animate-marquee gap-12 whitespace-nowrap">
            {[...items, ...items].map((it, i) => (
              <span key={i} className="text-lg font-semibold text-foreground/50">
                {it}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- moments ---------- */

const MOMENTS = [
  {
    icon: Coffee, tag: "Morning", title: "Order breakfast.",
    body: "Hot jollof, akara, or your favorite coffee — delivered before the day begins.",
    img: morningImg, tint: "from-[oklch(0.85_0.12_82)]/40",
  },
  {
    icon: Sun, tag: "Afternoon", title: "Send a parcel.",
    body: "Get documents and packages across town in hours, tracked from pickup to drop-off.",
    img: afternoonImg, tint: "from-[oklch(0.7_0.12_140)]/40",
  },
  {
    icon: Sunset, tag: "Evening", title: "Book an electrician.",
    body: "Trusted, verified artisans arrive at your door — plumbers, electricians, cleaners and more.",
    img: eveningImg, tint: "from-[oklch(0.7_0.15_50)]/40",
  },
  {
    icon: Moon, tag: "Night", title: "Order medicine.",
    body: "Late-night pharmacy runs, sorted. Prescriptions and essentials, right to your door.",
    img: nightImg, tint: "from-[oklch(0.4_0.09_240)]/40",
  },
];

function Moments() {
  return (
    <section id="moments" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold text-primary">
              Everyday moments
            </span>
            <h2 className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-5xl">
              A day, made simpler.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              From your first cup to your last errand — MyTijaara moves with you.
            </p>
          </Reveal>
        </div>

        <div className="mt-16 space-y-16 lg:space-y-24">
          {MOMENTS.map((m, i) => {
            const reverse = i % 2 === 1;
            const Icon = m.icon;
            return (
              <Reveal key={m.tag} delay={80}>
                <div
                  className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-16 ${
                    reverse ? "lg:[&>div:first-child]:order-2" : ""
                  }`}
                >
                  <div>
                    <div className={`relative overflow-hidden rounded-4xl border border-border shadow-elegant`}>
                      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${m.tint} to-transparent`} />
                      <img
                        src={m.img}
                        alt={m.title}
                        width={800}
                        height={800}
                        loading="lazy"
                        className="aspect-[4/3] w-full object-cover"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-semibold uppercase tracking-widest text-gold">
                        {m.tag}
                      </span>
                    </div>
                    <h3 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                      {m.title}
                    </h3>
                    <p className="mt-4 max-w-md text-lg leading-relaxed text-muted-foreground">
                      {m.body}
                    </p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal>
          <p className="mt-16 text-center font-display text-2xl font-semibold text-foreground/80">
            All from MyTijaara.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- services grid ---------- */

const SERVICES = [
  { icon: UtensilsCrossed, title: "Order food", body: "Local favourites and top restaurants delivered hot." },
  { icon: ShoppingBasket, title: "Buy groceries", body: "Fresh produce and weekly essentials in one basket." },
  { icon: Pill, title: "Pharmacy items", body: "Prescription refills and everyday health needs." },
  { icon: Store, title: "Shop local", body: "Discover businesses and vendors around you." },
  { icon: Package, title: "Send parcels", body: "Same-day delivery across town, tracked end-to-end." },
  { icon: Car, title: "Rent a car", body: "Trusted rentals for the day, week, or that big trip." },
  { icon: Wrench, title: "Book artisans", body: "Electricians, plumbers, cleaners — vetted and rated." },
  { icon: Sparkles, title: "Home services", body: "From laundry to fumigation, handled the right way." },
];

function Services() {
  return (
    <section id="services" className="relative bg-surface py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold text-primary">
              Everything you can do
            </span>
            <h2 className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-5xl">
              One app. All your errands.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Stop jumping between five different apps. MyTijaara puts it all in one place.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((s, i) => {
            const Icon = s.icon;
            const alt = i % 2 === 1;
            return (
              <Reveal key={s.title} delay={i * 40}>
                <div className="group relative h-full rounded-3xl border border-border bg-card p-7 transition-all hover:-translate-y-1 hover:border-primary/25 hover:shadow-soft">
                  <div
                    className={`grid h-12 w-12 place-items-center rounded-2xl ${
                      alt ? "bg-gold/20" : "bg-primary-soft"
                    }`}
                  >
                    <Icon className={`h-6 w-6 ${alt ? "text-[color:var(--gold-foreground)]" : "text-primary"}`} />
                  </div>
                  <h3 className="mt-6 font-display text-lg font-bold text-foreground">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {s.body}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------- why ---------- */

const WHY = [
  { icon: Sparkles, title: "One app for everything", body: "Food, shopping, parcels, artisans and more — no more switching apps." },
  { icon: MapPin, title: "Made for Nigeria", body: "Built around how we actually live, order and pay." },
  { icon: Shield, title: "Trusted partners", body: "Every rider, artisan and vendor is verified before they join." },
  { icon: Clock, title: "Fast and reliable", body: "Real-time tracking so you always know what's happening." },
];

function Why() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-14 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
          <div>
            <Reveal>
              <span className="text-xs font-semibold uppercase tracking-widest text-gold">
                Why MyTijaara
              </span>
              <h2 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
                Simpler days. <br />
                <span className="text-primary">Made in Nigeria.</span>
              </h2>
              <p className="mt-5 text-lg text-muted-foreground">
                We built MyTijaara so you can spend less time managing errands and more
                time on what actually matters.
              </p>
            </Reveal>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {WHY.map(({ icon: Icon, title, body }, i) => (
              <Reveal key={title} delay={i * 80}>
                <div className="h-full rounded-3xl border border-border bg-card p-6 transition-all hover:border-primary/25 hover:shadow-soft">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-gold-gradient text-gold-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-bold">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- how it works ---------- */

const STEPS = [
  { n: "01", title: "Download the app", body: "Sign up in under a minute with just your phone number." },
  { n: "02", title: "Choose what you need", body: "Food, groceries, an artisan, a ride — pick from one home screen." },
  { n: "03", title: "Track it live", body: "See your rider or artisan on the way, in real time." },
  { n: "04", title: "Relax", body: "Pay how you want. Rate your experience. Do it again tomorrow." },
];

function How() {
  return (
    <section id="how" className="relative overflow-hidden bg-primary py-24 text-primary-foreground sm:py-32">
      <div className="pointer-events-none absolute -left-40 top-1/2 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-gold opacity-15 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 top-10 h-[400px] w-[400px] rounded-full bg-white/5 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-1.5 text-xs font-semibold text-primary-foreground">
              How it works
            </span>
            <h2 className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-5xl">
              Get started in four easy steps.
            </h2>
          </Reveal>
        </div>
        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 100}>
              <div className="relative h-full rounded-3xl border border-primary-foreground/15 bg-primary-foreground/[0.06] p-7 backdrop-blur-sm">
                <span className="font-display text-5xl font-bold text-gold">{s.n}</span>
                <h3 className="mt-4 font-display text-xl font-bold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-primary-foreground/75">
                  {s.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- product screens ---------- */

function PhoneMock({
  header, accent, children, className = "",
}: { header: string; accent: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative mx-auto w-full max-w-[280px] ${className}`}>
      <div className="rounded-[2.4rem] bg-foreground p-2 shadow-elegant">
        <div className="overflow-hidden rounded-[2rem] bg-background">
          <div
            className="flex items-center justify-between px-5 pt-4 pb-3 text-xs font-semibold text-primary-foreground"
            style={{ background: accent }}
          >
            <span>9:41</span>
            <span>MyTijaara</span>
            <span>●●●</span>
          </div>
          <div className="p-4">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {header}
            </p>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductScreens() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold text-primary">
              Product screens
            </span>
            <h2 className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-5xl">
              Clean, calm, familiar.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Designed so anyone can use it — from your cousin at Uni to your grandma.
            </p>
          </Reveal>
        </div>

        <div className="mt-20 grid gap-10 lg:grid-cols-3 lg:gap-6">
          <Reveal delay={0}>
            <PhoneMock header="Home" accent="var(--gradient-primary)" className="lg:mt-16">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { i: UtensilsCrossed, l: "Food" },
                  { i: ShoppingBasket, l: "Grocery" },
                  { i: Pill, l: "Pharmacy" },
                  { i: Package, l: "Parcel" },
                  { i: Car, l: "Car" },
                  { i: Wrench, l: "Artisan" },
                ].map(({ i: Icon, l }) => (
                  <div key={l} className="flex flex-col items-center gap-1 rounded-2xl bg-primary-soft p-3">
                    <Icon className="h-5 w-5 text-primary" />
                    <span className="text-[10px] font-semibold">{l}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-2xl bg-gradient-to-br from-primary to-[oklch(0.42_0.1_156)] p-3 text-primary-foreground">
                <p className="text-[10px] opacity-80">Free delivery</p>
                <p className="text-sm font-bold">On your first order</p>
              </div>
            </PhoneMock>
          </Reveal>

          <Reveal delay={120}>
            <PhoneMock header="Tracking" accent="var(--gradient-primary)">
              <div className="h-32 rounded-2xl bg-[radial-gradient(circle_at_60%_40%,color-mix(in_oklab,var(--primary)_25%,transparent),transparent_60%)] bg-primary-soft relative overflow-hidden">
                <div className="absolute left-6 top-6 h-2 w-2 rounded-full bg-primary ring-4 ring-primary/20" />
                <div className="absolute right-6 bottom-6 h-2 w-2 rounded-full bg-gold ring-4 ring-gold/30" />
                <svg className="absolute inset-0" viewBox="0 0 200 128">
                  <path d="M20 20 Q100 40 180 100" fill="none" stroke="oklch(0.36 0.09 156)" strokeWidth="2" strokeDasharray="4 4" />
                </svg>
              </div>
              <div className="mt-3 rounded-2xl border border-border p-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-gold-gradient" />
                  <div className="flex-1">
                    <p className="text-xs font-bold">Chinedu is on the way</p>
                    <p className="text-[10px] text-muted-foreground">Arriving in 8 min</p>
                  </div>
                </div>
              </div>
            </PhoneMock>
          </Reveal>

          <Reveal delay={240}>
            <PhoneMock header="Book artisan" accent="var(--gradient-primary)" className="lg:mt-16">
              {[
                { n: "Adaeze O.", r: "Electrician", s: "4.9" },
                { n: "Musa I.", r: "Plumber", s: "4.8" },
                { n: "Blessing E.", r: "Cleaner", s: "5.0" },
              ].map((p) => (
                <div key={p.n} className="mb-2 flex items-center gap-3 rounded-2xl border border-border p-2.5">
                  <div className="h-9 w-9 rounded-full bg-primary-gradient" />
                  <div className="flex-1">
                    <p className="text-xs font-bold">{p.n}</p>
                    <p className="text-[10px] text-muted-foreground">{p.r}</p>
                  </div>
                  <div className="flex items-center gap-0.5 text-[10px] font-semibold text-gold">
                    <Star className="h-3 w-3 fill-current" /> {p.s}
                  </div>
                </div>
              ))}
            </PhoneMock>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ---------- built for Nigerians ---------- */

function BuiltForNigerians() {
  const points = [
    "Pay with cards, transfers or on delivery",
    "Prices in Naira. No hidden fees.",
    "Support in English and pidgin",
    "Available across major Nigerian cities",
  ];
  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-4xl border border-border bg-card p-8 shadow-soft sm:p-14">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary-soft" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-gold/15" />
          <div className="relative grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <Reveal>
                <span className="text-xs font-semibold uppercase tracking-widest text-gold">
                  Built for Nigerians
                </span>
                <h2 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
                  From Lagos to Kano, and everywhere in between.
                </h2>
                <p className="mt-5 text-lg text-muted-foreground">
                  We know Nigerian streets, Nigerian traffic, Nigerian tastes. MyTijaara is
                  designed for how we really live — not copied from somewhere else.
                </p>
                <ul className="mt-8 space-y-3">
                  {points.map((p) => (
                    <li key={p} className="flex items-start gap-3">
                      <span className="mt-0.5 grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-base text-foreground">{p}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>
            <Reveal delay={120}>
              <div className="relative mx-auto grid max-w-md grid-cols-2 gap-4">
                {[
                  { c: "Lagos", n: "Mainland • Island" },
                  { c: "Abuja", n: "FCT" },
                  { c: "Port Harcourt", n: "Rivers" },
                  { c: "Ibadan", n: "Oyo" },
                  { c: "Kano", n: "Kano" },
                  { c: "Enugu", n: "Enugu" },
                ].map((city, i) => (
                  <div
                    key={city.c}
                    className={`rounded-2xl border border-border bg-background p-4 shadow-soft ${
                      i % 2 ? "mt-6" : ""
                    }`}
                  >
                    <MapPin className="h-4 w-4 text-primary" />
                    <p className="mt-2 font-display text-lg font-bold">{city.c}</p>
                    <p className="text-xs text-muted-foreground">{city.n}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- partner benefits ---------- */

const PARTNERS = [
  {
    tag: "For vendors",
    title: "Grow your shop with MyTijaara.",
    body: "Reach new customers in your area without setting up your own store, app or delivery team.",
    perks: ["New customers, every day", "Simple dashboard on your phone", "Get paid on time"],
  },
  {
    tag: "For riders",
    title: "Earn on your schedule.",
    body: "Deliver food, packages and groceries. Choose when you work, get paid weekly.",
    perks: ["Flexible hours", "Weekly payouts", "In-app support 24/7"],
  },
  {
    tag: "For artisans",
    title: "Meet more clients — get paid faster.",
    body: "Show off your work, get booked in your area and get paid straight to your account.",
    perks: ["Verified profile", "Bookings that fit your day", "Fair, upfront pricing"],
  },
];

function Partners() {
  return (
    <section id="partners" className="bg-surface py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold text-primary">
              Grow with us
            </span>
            <h2 className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-5xl">
              A better way to earn.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Vendors, riders and artisans — MyTijaara helps you find more customers.
            </p>
          </Reveal>
        </div>
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {PARTNERS.map((p, i) => (
            <Reveal key={p.tag} delay={i * 100}>
              <div className="group h-full rounded-3xl border border-border bg-card p-8 transition-all hover:-translate-y-1 hover:border-primary/25 hover:shadow-elegant">
                <span className="inline-flex rounded-full bg-primary-soft px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                  {p.tag}
                </span>
                <h3 className="mt-5 font-display text-2xl font-bold">{p.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
                <ul className="mt-6 space-y-2.5 border-t border-border pt-6">
                  {p.perks.map((perk) => (
                    <li key={perk} className="flex items-center gap-2.5 text-sm">
                      <Check className="h-4 w-4 text-primary" />
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href="#waitlist"
                  className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-primary transition-transform hover:translate-x-0.5"
                >
                  Join as {p.tag.replace("For ", "").replace(/s$/, "")} <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- waitlist ---------- */

function Waitlist() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("customer");
  const [submitted, setSubmitted] = useState(false);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
  };
  return (
    <section id="waitlist" className="relative overflow-hidden py-24 sm:py-32">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-4xl bg-primary-gradient p-8 text-primary-foreground shadow-elegant sm:p-16">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-gold opacity-25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-white/5 blur-3xl" />

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

            {submitted ? (
              <div className="mt-10 rounded-2xl border border-primary-foreground/20 bg-primary-foreground/10 p-6">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-gold-gradient text-gold-foreground">
                  <Check className="h-6 w-6" />
                </div>
                <p className="mt-4 font-display text-xl font-bold">You're on the list! 🎉</p>
                <p className="mt-2 text-sm text-primary-foreground/80">
                  We'll email you as soon as MyTijaara launches in your city.
                </p>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-10 space-y-4">
                <div className="flex flex-wrap justify-center gap-2">
                  {[
                    { v: "customer", l: "I'm a customer" },
                    { v: "vendor", l: "I'm a vendor" },
                    { v: "rider", l: "I'm a rider" },
                    { v: "artisan", l: "I'm an artisan" },
                  ].map((r) => (
                    <button
                      key={r.v}
                      type="button"
                      onClick={() => setRole(r.v)}
                      className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                        role === r.v
                          ? "bg-gold-gradient text-gold-foreground shadow-soft"
                          : "border border-primary-foreground/25 text-primary-foreground/85 hover:bg-primary-foreground/10"
                      }`}
                    >
                      {r.l}
                    </button>
                  ))}
                </div>
                <div className="mx-auto flex max-w-lg flex-col gap-2 sm:flex-row">
                  <label htmlFor="email" className="sr-only">Email address</label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="flex-1 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-5 py-3.5 text-sm text-primary-foreground placeholder:text-primary-foreground/60 outline-none focus:border-gold focus:bg-primary-foreground/15"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-gold-gradient px-6 py-3.5 text-sm font-bold text-gold-foreground shadow-soft transition-transform hover:scale-[1.03]"
                  >
                    Join the waitlist <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-xs text-primary-foreground/60">
                  No spam. Unsubscribe anytime.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- FAQ ---------- */

const FAQS = [
  { q: "What is MyTijaara?", a: "MyTijaara is one app that lets you order food, buy groceries and medicine, book artisans, send parcels, rent cars and shop from local businesses — all in Nigeria." },
  { q: "Where is MyTijaara available?", a: "We're launching first in Lagos, Abuja and Port Harcourt, then rolling out across Nigeria. Join the waitlist and we'll let you know as soon as we're in your city." },
  { q: "How much does it cost to use?", a: "The app is free to download. You only pay for what you order, at prices set by our vendors and partners. Delivery fees are shown clearly before you check out." },
  { q: "How do I pay?", a: "You can pay with cards, bank transfers or on delivery — whatever works best for you." },
  { q: "How can I become a vendor, rider or artisan?", a: "Pick your role on the waitlist form above. We'll reach out with next steps as we onboard partners in your area." },
  { q: "Is my information safe?", a: "Yes. We take your privacy seriously and only use your information to give you a great experience with MyTijaara." },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="py-24 sm:py-32">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold text-primary">
              FAQ
            </span>
            <h2 className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-5xl">
              Questions, answered.
            </h2>
          </Reveal>
        </div>
        <div className="mt-14 divide-y divide-border rounded-3xl border border-border bg-card">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-primary-soft/40 sm:px-8"
                >
                  <span className="font-display text-base font-semibold sm:text-lg">{f.q}</span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-primary transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-6 text-sm leading-relaxed text-muted-foreground sm:px-8 sm:text-base">
                    {f.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------- footer ---------- */

function Footer() {
  return (
    <footer className="border-t border-border bg-surface py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Everything you need, all in one place. Built for Nigerians.
            </p>
            <div className="mt-5 flex gap-3">
              {[Instagram, Twitter, Facebook].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  aria-label="Social link"
                  className="grid h-10 w-10 place-items-center rounded-full border border-border text-foreground/70 transition-colors hover:bg-primary hover:text-primary-foreground"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
          {[
            { h: "Product", l: ["Everyday moments", "What you can do", "How it works", "FAQ"] },
            { h: "Partners", l: ["Vendors", "Riders", "Artisans", "Contact sales"] },
            { h: "Company", l: ["About", "Careers", "Privacy", "Terms"] },
          ].map((col) => (
            <div key={col.h}>
              <p className="font-display text-sm font-bold">{col.h}</p>
              <ul className="mt-4 space-y-2.5">
                {col.l.map((it) => (
                  <li key={it}>
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
                      {it}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} MyTijaara. Made with love in Nigeria.
          </p>
          <p className="text-xs text-muted-foreground">
            Everything you need, all in one place.
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ---------- page ---------- */

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main>
        <Hero />
        <TrustedBy />
        <Moments />
        <Services />
        <Why />
        <How />
        <ProductScreens />
        <BuiltForNigerians />
        <Partners />
        <Waitlist />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
