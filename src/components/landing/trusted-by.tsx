import { Sparkles } from "lucide-react";
import { useCmsData } from "@/lib/cms-context";

type StatItem = { label: string; value: string };
type StatsCmsData = { items?: StatItem[] };

const HARDCODED_ITEMS = [
  "Local Restaurants",
  "Trusted Pharmacies",
  "Verified Artisans",
  "Supermarkets",
  "Delivery Riders",
  "Car Rentals",
  "Neighborhood Shops",
];

const DEFAULT: StatsCmsData = { items: [] };

export function TrustedBy() {
  const cms = useCmsData("statistics", DEFAULT);

  // When the admin has populated statistics items, show "value label" per item.
  // Fall back to the category-name marquee otherwise.
  const marqueeItems =
    cms.items && cms.items.length > 0
      ? cms.items.map((s) => `${s.value} ${s.label}`)
      : HARDCODED_ITEMS;

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
            {[...marqueeItems, ...marqueeItems].map((it, i) => (
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
