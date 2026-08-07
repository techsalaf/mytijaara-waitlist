import { Reveal } from "./reveal";
import { useCmsData } from "@/lib/cms-context";

type HowStep = { step?: number; n?: string; title: string; body?: string; description?: string };
type HowCmsData = { heading?: string; steps?: HowStep[] };

const DEFAULT: HowCmsData = {
  heading: "Get started in four easy steps.",
  steps: [
    { n: "01", title: "Download the app", body: "Sign up in under a minute with just your phone number." },
    { n: "02", title: "Choose what you need", body: "Food, groceries, an artisan, a ride — pick from one home screen." },
    { n: "03", title: "Track it live", body: "See your rider or artisan on the way, in real time." },
    { n: "04", title: "Relax", body: "Pay how you want. Rate your experience. Do it again tomorrow." },
  ],
};

export function How() {
  const cms = useCmsData("how", DEFAULT);
  const steps = cms.steps && cms.steps.length > 0 ? cms.steps : DEFAULT.steps!;

  return (
    <section id="how" className="relative overflow-hidden bg-primary-gradient py-24 text-primary-foreground sm:py-32">
      <div className="pointer-events-none absolute -left-40 top-1/2 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-gold opacity-15 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 top-10 h-[400px] w-[400px] rounded-full bg-primary-foreground/5 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-1.5 text-xs font-semibold text-primary-foreground">
              How it works
            </span>
            <h2 className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-5xl">
              {cms.heading}
            </h2>
          </Reveal>
        </div>
        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.slice(0, 4).map((s, i) => {
            const n = s.n ?? String((s.step ?? i + 1)).padStart(2, "0");
            const body = s.description ?? s.body ?? "";
            return (
              <Reveal key={s.title} delay={i * 100}>
                <div className="relative h-full rounded-3xl border border-primary-foreground/15 bg-primary-foreground/[0.06] p-7 backdrop-blur-sm">
                  <span className="font-display text-5xl font-bold text-gold">{n}</span>
                  <h3 className="mt-4 font-display text-xl font-bold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-primary-foreground/75">{body}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
