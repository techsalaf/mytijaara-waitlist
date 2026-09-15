import {
  UtensilsCrossed,
  ShoppingBasket,
  Pill,
  Store,
  Package,
  Car,
  Wrench,
  Sparkles,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";

import { Reveal } from "./reveal";
import { useCmsData } from "@/lib/cms-context";

// Icons are code — they can't be stored in the DB. Map by position so an
// admin can reorder or reword items without losing the visual icons.
const ICONS = [
  UtensilsCrossed,
  ShoppingBasket,
  MessageCircle,
  Wrench,
  Package,
  Pill,
  Store,
  ShieldCheck,
];
const ICON_ALT_MASK = [false, true, false, true, false, true, false, true];

type ServiceItem = { title: string; description?: string; body?: string; enabled?: boolean };
type ServicesCmsData = { heading?: string; subheading?: string; items?: ServiceItem[] };

const DEFAULT: ServicesCmsData = {
  heading: "The everyday operating system for Nigeria.",
  subheading:
    "Food, daily shopping, verified artisans, and package logistics — powered in the app and integrated with WhatsApp.",
  items: [
    { title: "Hot food delivery", body: "Local favourites and top restaurants delivered to your doorstep in minutes." },
    { title: "Groceries & market", body: "Fresh produce, household supplies, and essentials packed with care." },
    { title: "WhatsApp shopping", body: "Browse vendor catalogs, order, and pay without leaving your WhatsApp chats." },
    { title: "Vetted local artisans", body: "Electricians, plumbers, carpenters, and technicians rated by neighbours." },
    { title: "Same-day parcel runs", body: "Fast, GPS-tracked parcel delivery across your city with recipient PIN verification." },
    { title: "Pharmacy essentials", body: "Everyday health essentials and OTC medicines delivered promptly." },
    { title: "Merchant sales engine", body: "Automated orders, inventory tracking, and prompt bank settlement for local sellers." },
    { title: "100% Escrow safety", body: "Funds stay protected until you receive and verify your order or service." },
  ],
};

export function Services() {
  const cms = useCmsData("services", DEFAULT);
  if (!cms) return null;
  // Each row carries its own Active switch in Admin → CMS → Features. Honouring
  // it here is the whole point of that switch: the editor wrote `enabled: false`
  // and this component used to render the row anyway, so switching a single
  // service off did nothing on the page.
  //
  // The fallback keys off whether the admin has a list at all, never off the
  // filtered length — switching every row off is a deliberate choice and must
  // render nothing, not silently restore the eight bundled defaults.
  const saved = cms.items && cms.items.length > 0 ? cms.items : DEFAULT.items!;
  const items = saved.filter((s) => s.enabled !== false);

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
