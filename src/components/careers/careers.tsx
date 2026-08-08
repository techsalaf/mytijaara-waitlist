import { Reveal } from "@/components/landing/reveal";
import { useCmsData } from "@/lib/cms-context";
import { Briefcase, MapPin, Clock, ArrowRight } from "lucide-react";

type Position = {
  title: string;
  department: string;
  location: string;
  type: string;
  description?: string;
  body?: string;
};

type Benefit = { title: string; description?: string; body?: string };

type CareersCmsData = {
  hero?: { heading?: string; subheading?: string };
  culture?: { heading?: string; body?: string };
  benefits?: { heading?: string; items?: Benefit[] };
  positions?: { heading?: string; openings?: Position[] };
};

const DEFAULT: CareersCmsData = {
  hero: {
    heading: "Build the future of Nigerian tech.",
    subheading: "Join a team that's reimagining how millions of Nigerians get things done every day. We're just getting started.",
  },
  culture: {
    heading: "Our culture",
    body: "We move fast, ship often, and own our work. Everyone here has real impact from day one. We're building something that matters — a product Nigerians actually use and love. No corporate BS. No endless meetings. Just great people solving hard problems together.",
  },
  benefits: {
    heading: "What we offer",
    items: [
      { title: "Competitive salary", body: "Fair pay that matches the market and grows with you." },
      { title: "Health coverage", body: "Comprehensive health insurance for you and your family." },
      { title: "Flexible work", body: "Hybrid setup. Work from home when you need to." },
      { title: "Growth budget", body: "Annual learning and development stipend for courses, conferences, and books." },
      { title: "Equity", body: "Early-stage equity grants. Build value as we grow." },
      { title: "Real impact", body: "Your work reaches millions of users. No fake busy work." },
    ],
  },
  positions: {
    heading: "Open positions",
    openings: [
      {
        title: "Senior Backend Engineer",
        department: "Engineering",
        location: "Lagos, Nigeria",
        type: "Full-time",
        body: "Build scalable APIs and services that power food delivery, ride-hailing, and marketplace features for millions of users.",
      },
      {
        title: "Product Designer",
        department: "Design",
        location: "Lagos, Nigeria",
        type: "Full-time",
        body: "Design intuitive experiences for a super-app serving diverse needs. Own the end-to-end product design process.",
      },
      {
        title: "Growth Lead",
        department: "Marketing",
        location: "Lagos, Nigeria",
        type: "Full-time",
        body: "Drive user acquisition and retention. Run experiments, analyze data, and scale what works.",
      },
    ],
  },
};

export function Careers() {
  const cms = useCmsData("careers", DEFAULT);
  const hero = cms.hero ?? DEFAULT.hero!;
  const culture = cms.culture ?? DEFAULT.culture!;
  const benefits = cms.benefits ?? DEFAULT.benefits!;
  const positions = cms.positions ?? DEFAULT.positions!;

  const benefitItems = benefits.items && benefits.items.length > 0 ? benefits.items : DEFAULT.benefits!.items!;
  const openings = positions.openings && positions.openings.length > 0 ? positions.openings : DEFAULT.positions!.openings!;

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden bg-primary-gradient py-24 text-primary-foreground sm:py-32">
        <div className="pointer-events-none absolute -left-40 top-1/2 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-gold opacity-15 blur-3xl" />
        <div className="pointer-events-none absolute -right-40 top-10 h-[400px] w-[400px] rounded-full bg-primary-foreground/5 blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
          <Reveal>
            <h1 className="font-display text-5xl font-bold tracking-tight sm:text-6xl">
              {hero.heading}
            </h1>
            {hero.subheading && (
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-primary-foreground/90">
                {hero.subheading}
              </p>
            )}
          </Reveal>
        </div>
      </section>

      {/* Culture */}
      <section className="bg-background py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Reveal>
            <h2 className="text-center font-display text-3xl font-bold sm:text-4xl">
              {culture.heading}
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              {culture.body}
            </p>
          </Reveal>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-surface py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal>
            <h2 className="text-center font-display text-3xl font-bold sm:text-4xl">
              {benefits.heading}
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {benefitItems.map((b, i) => {
              const body = b.description ?? b.body ?? "";
              return (
                <Reveal key={b.title} delay={i * 40}>
                  <div className="group h-full rounded-3xl border border-border bg-card p-7 transition-all duration-300 hover:-translate-y-2 hover:border-primary/30 hover:shadow-elegant">
                    <h3 className="font-display text-lg font-bold transition-colors duration-200 group-hover:text-primary">
                      {b.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground transition-colors duration-200 group-hover:text-foreground/80">
                      {body}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section className="bg-background py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <Reveal>
            <h2 className="text-center font-display text-3xl font-bold sm:text-4xl">
              {positions.heading}
            </h2>
          </Reveal>
          <div className="mt-14 space-y-4">
            {openings.map((p, i) => {
              const body = p.description ?? p.body ?? "";
              return (
                <Reveal key={p.title} delay={i * 60}>
                  <a
                    href={`mailto:careers@mytijaara.com?subject=Application: ${p.title}`}
                    className="group block rounded-3xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-elegant"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1">
                        <div className="flex items-start gap-3">
                          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft transition-all duration-300 group-hover:scale-110 group-hover:bg-primary/20">
                            <Briefcase className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-display text-xl font-bold transition-colors duration-200 group-hover:text-primary">
                              {p.title}
                            </h3>
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1.5">
                                <Briefcase className="h-3.5 w-3.5" />
                                {p.department}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5" />
                                {p.location}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5" />
                                {p.type}
                              </span>
                            </div>
                            {body && (
                              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                                {body}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-primary transition-transform duration-300 group-hover:translate-x-1">
                        Apply
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  </a>
                </Reveal>
              );
            })}
          </div>
          <Reveal delay={openings.length * 60 + 100}>
            <div className="mt-10 text-center">
              <p className="text-sm text-muted-foreground">
                Don't see a fit?{" "}
                <a
                  href="mailto:careers@mytijaara.com"
                  className="font-semibold text-primary transition-colors hover:text-primary/80"
                >
                  Send us your resume
                </a>{" "}
                and tell us why you want to join.
              </p>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
