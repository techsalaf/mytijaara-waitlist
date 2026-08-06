import { Check } from "lucide-react";

import { Reveal } from "./reveal";
import { useCmsData } from "@/lib/cms-context";

const NG_CARDS = [
  { title: "Suya night", emoji: "🍢", bg: "bg-[oklch(0.94_0.06_70)]", fg: "text-[oklch(0.45_0.15_45)]" },
  { title: "Owambe fit", emoji: "👗", bg: "bg-[oklch(0.93_0.05_240)]", fg: "text-[oklch(0.42_0.18_250)]" },
  { title: "Market run", emoji: "🛍️", bg: "bg-[oklch(0.93_0.05_240)]", fg: "text-[oklch(0.42_0.18_250)]" },
  { title: "Home fix", emoji: "🔧", bg: "bg-[oklch(0.94_0.06_70)]", fg: "text-[oklch(0.45_0.15_45)]" },
];

type BfnCmsData = { heading?: string; body?: string; points?: string[] };

const DEFAULT: BfnCmsData = {
  heading: "Made here. For here.",
  body: "We know Nigerian streets, Nigerian shops, Nigerian tastes — MyTijaara is built with all of it in mind. Not a copy of something from abroad.",
  points: [
    "Pay how you already pay — card, transfer or on delivery.",
    "Prices in naira. No surprise conversions.",
    "Support that speaks your language, based in Nigeria.",
    "Works with the shops and services on your street.",
  ],
};

export function BuiltForNigerians() {
  const cms = useCmsData("built_for_nigerians", DEFAULT);
  const points = cms.points && cms.points.length > 0 ? cms.points : DEFAULT.points!;

  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="relative grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <Reveal>
              <span className="inline-flex items-center rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold text-foreground/70">
                Built for Nigerians
              </span>
              <h2 className="mt-6 font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                {cms.heading}
              </h2>
              <p className="mt-5 max-w-lg text-lg text-muted-foreground">
                {cms.body}
              </p>
              <ul className="mt-8 space-y-4">
                {points.map((p) => (
                  <li key={p} className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gold text-gold-foreground">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                    <span className="text-base text-foreground/85">{p}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
          <Reveal delay={120}>
            <div className="mx-auto grid w-full max-w-md grid-cols-2 gap-4 sm:gap-5">
              {NG_CARDS.map((c, i) => (
                <div
                  key={c.title}
                  className={`group relative flex aspect-[3/4] flex-col justify-between overflow-hidden rounded-3xl ${c.bg} p-5 transition-transform hover:-translate-y-1 ${
                    i % 2 ? "mt-8" : ""
                  }`}
                >
                  <div className="text-4xl sm:text-5xl transition-transform group-hover:scale-110 group-hover:-rotate-6">
                    {c.emoji}
                  </div>
                  <p className={`font-display text-base font-bold sm:text-lg ${c.fg}`}>
                    {c.title}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
