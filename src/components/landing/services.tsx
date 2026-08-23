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
import { useCmsData } from "@/lib/cms-context";

// Icons are code — they can't be stored in the DB. Map by position so an
// admin can reorder or reword items without losing the visual icons.
const ICONS = [UtensilsCrossed, ShoppingBasket, Pill, Store, Package, Car, Wrench, Sparkles];
const ICON_ALT_MASK = [false, true, false, true, false, true, false, true];

type ServiceItem = { title: string; description?: string; body?: string };
type ServicesCmsData = { heading?: string; subheading?: string; items?: ServiceItem[] };

const DEFAULT: ServicesCmsData = {
  heading: "One app. All your errands.",
  subheading: "Stop jumping between five different apps. MyTijaara puts it all in one place.",
  items: [
    { title: "Order food", body: "Local favourites and top restaurants delivered hot." },
    { title: "Buy groceries", body: "Fresh produce and weekly essentials in one basket." },
    { title: "Pharmacy items", body: "Prescription refills and everyday health needs." },
    { title: "Shop local", body: "Discover businesses and vendors around you." },
    { title: "Send parcels", body: "Same-day delivery across town, tracked end-to-end." },
    { title: "Rent a car", body: "Trusted rentals for the day, week, or that big trip." },
    { title: "Book artisans", body: "Electricians, plumbers, cleaners — vetted and rated." },
    { title: "Home services", body: "From laundry to fumigation, handled the right way." },
  ],
};

export function Services() {
  const cms = useCmsData("services", DEFAULT);
  if (!cms) return null;
  const items = (cms.items && cms.items.length > 0 ? cms.items : DEFAULT.items!);

  return (
    <section id="services" className="relative bg-surface py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold text-primary">
              Everything you can do
            </span>
            <h2 className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-5xl">
              {cms.heading}
            </h2>
            {cms.subheading && (
              <p className="mt-4 text-lg text-muted-foreground">{cms.subheading}</p>
            )}
          </Reveal>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.slice(0, 8).map((s, i) => {
            const Icon = ICONS[i % ICONS.length];
            const alt = ICON_ALT_MASK[i % ICON_ALT_MASK.length];
            const body = s.description ?? s.body ?? "";
            return (
              <Reveal key={s.title} delay={i * 40}>
                <div className="group relative h-full rounded-3xl border border-border bg-card p-7 transition-all duration-300 hover:-translate-y-2 hover:border-primary/30 hover:shadow-elegant cursor-pointer">
                  <div
                    className={`grid h-12 w-12 place-items-center rounded-2xl transition-all duration-300 group-hover:scale-110 ${
                      alt ? "bg-gold/20 group-hover:bg-gold/30" : "bg-primary-soft group-hover:bg-primary/20"
                    }`}
                  >
                    <Icon className={`h-6 w-6 transition-transform duration-300 group-hover:rotate-6 ${alt ? "text-gold-foreground" : "text-primary"}`} />
                  </div>
                  <h3 className="mt-6 font-display text-lg font-bold text-foreground transition-colors duration-200 group-hover:text-primary">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground transition-colors duration-200 group-hover:text-foreground/80">{body}</p>
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/0 via-primary/0 to-primary/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
