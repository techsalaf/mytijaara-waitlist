import { Sparkles, MapPin, Shield, Clock } from "lucide-react";

import { Reveal } from "./reveal";

const WHY = [
  { icon: Sparkles, title: "One app for everything", body: "Food, shopping, parcels, artisans and more — no more switching apps." },
  { icon: MapPin, title: "Made for Nigeria", body: "Built around how we actually live, order and pay." },
  { icon: Shield, title: "Trusted partners", body: "Every rider, artisan and vendor is verified before they join." },
  { icon: Clock, title: "Fast and reliable", body: "Real-time tracking so you always know what's happening." },
];

export function Why() {
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
