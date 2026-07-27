import {
  UtensilsCrossed,
  ShoppingBasket,
  Pill,
  Store,
  Package,
  Car,
  Wrench,
  Sparkles,
} from "lucide-react";

import { Reveal } from "./reveal";

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

export function Services() {
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
                    <Icon className={`h-6 w-6 ${alt ? "text-gold-foreground" : "text-primary"}`} />
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
