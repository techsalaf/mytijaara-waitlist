import { Sparkles, MapPin, Shield, Clock } from "lucide-react";

import { Reveal } from "./reveal";
import { useCmsData } from "@/lib/cms-context";

const ICONS = [Sparkles, MapPin, Shield, Clock];

type WhyPoint = { title: string; body?: string; description?: string };
type WhyCmsData = { heading?: string; subheading?: string; points?: WhyPoint[] };

const DEFAULT: WhyCmsData = {
  heading: "Simpler days. Made in Nigeria.",
  subheading: "We built MyTijaara so you can spend less time managing errands and more time on what actually matters.",
  points: [
    { title: "One app for everything", body: "Food, shopping, parcels, artisans and more — no more switching apps." },
    { title: "Made for Nigeria", body: "Built around how we actually live, order and pay." },
    { title: "Trusted partners", body: "Every rider, artisan and vendor is verified before they join." },
    { title: "Fast and reliable", body: "Real-time tracking so you always know what's happening." },
  ],
};

export function Why() {
  const cms = useCmsData("why", DEFAULT);
  if (!cms) return null;
  const points = cms.points && cms.points.length > 0 ? cms.points : DEFAULT.points!;

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
                {cms.heading}
              </h2>
              <p className="mt-5 text-lg text-muted-foreground">
                {cms.subheading}
              </p>
            </Reveal>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {points.slice(0, 4).map((p, i) => {
              const Icon = ICONS[i % ICONS.length];
              const body = p.description ?? p.body ?? "";
              return (
                <Reveal key={p.title} delay={i * 80}>
                  <div className="h-full rounded-3xl border border-border bg-card p-6 transition-all hover:border-primary/25 hover:shadow-soft">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-gold-gradient text-gold-foreground">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 font-display text-lg font-bold">{p.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
