import { Reveal } from "@/components/landing/reveal";
import { useCmsData } from "@/lib/cms-context";
import { Users, Target, Heart, Zap } from "lucide-react";

type Value = { icon?: string; title: string; description?: string; body?: string };
type TeamMember = { name: string; role: string; bio?: string };
type AboutCmsData = {
  hero?: { heading?: string; subheading?: string };
  mission?: { heading?: string; body?: string };
  values?: { heading?: string; items?: Value[] };
  team?: { heading?: string; members?: TeamMember[] };
};

const ICONS = [Users, Target, Heart, Zap];

const DEFAULT: AboutCmsData = {
  hero: {
    heading: "We're building the everything app for Nigeria.",
    subheading: "One platform that handles all your daily needs — food, groceries, rides, artisans, and more. Simple. Fast. Built for Nigerians by Nigerians.",
  },
  mission: {
    heading: "Our mission",
    body: "MyTijaara exists to make everyday life easier for Nigerians. We believe you shouldn't need five different apps to get through your day. From ordering lunch to booking a plumber, it should all be in one place — reliable, fast, and designed for how we actually live.",
  },
  values: {
    heading: "What drives us",
    items: [
      { title: "Built for Nigerians", body: "Every feature is designed with Nigerian cities, neighborhoods, and lifestyles in mind." },
      { title: "Simplicity first", body: "One app. One account. No confusion. Everything you need without the clutter." },
      { title: "Trust and safety", body: "Every vendor, rider, and artisan is vetted. Every transaction is secure. Your peace of mind matters." },
      { title: "Speed that counts", body: "From ordering to delivery, we respect your time. Real-time tracking. No surprises." },
    ],
  },
  team: {
    heading: "Meet the team",
    members: [
      { name: "Coming soon", role: "Leadership team profiles will be added here.", bio: "Check back soon." },
    ],
  },
};

export function About() {
  const cms = useCmsData("about", DEFAULT);
  const hero = cms.hero ?? DEFAULT.hero!;
  const mission = cms.mission ?? DEFAULT.mission!;
  const values = cms.values ?? DEFAULT.values!;
  const team = cms.team ?? DEFAULT.team!;

  const valueItems = values.items && values.items.length > 0 ? values.items : DEFAULT.values!.items!;

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

      {/* Mission */}
      <section className="bg-background py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Reveal>
            <h2 className="text-center font-display text-3xl font-bold sm:text-4xl">
              {mission.heading}
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              {mission.body}
            </p>
          </Reveal>
        </div>
      </section>

      {/* Values */}
      <section className="bg-surface py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal>
            <h2 className="text-center font-display text-3xl font-bold sm:text-4xl">
              {values.heading}
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {valueItems.slice(0, 4).map((v, i) => {
              const Icon = ICONS[i % ICONS.length];
              const body = v.description ?? v.body ?? "";
              return (
                <Reveal key={v.title} delay={i * 50}>
                  <div className="group h-full rounded-3xl border border-border bg-card p-7 transition-all duration-300 hover:-translate-y-2 hover:border-primary/30 hover:shadow-elegant">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft transition-all duration-300 group-hover:scale-110 group-hover:bg-primary/20">
                      <Icon className="h-6 w-6 text-primary transition-transform duration-300 group-hover:rotate-6" />
                    </div>
                    <h3 className="mt-6 font-display text-lg font-bold transition-colors duration-200 group-hover:text-primary">
                      {v.title}
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

      {/* Team */}
      <section className="bg-background py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal>
            <h2 className="text-center font-display text-3xl font-bold sm:text-4xl">
              {team.heading}
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {team.members && team.members.length > 0 ? (
              team.members.map((m, i) => (
                <Reveal key={m.name} delay={i * 60}>
                  <div className="rounded-3xl border border-border bg-card p-6 text-center transition-all duration-300 hover:border-primary/30 hover:shadow-elegant">
                    <div className="mx-auto h-24 w-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/10" />
                    <h3 className="mt-4 font-display text-lg font-bold">{m.name}</h3>
                    <p className="text-sm text-primary">{m.role}</p>
                    {m.bio && <p className="mt-2 text-sm text-muted-foreground">{m.bio}</p>}
                  </div>
                </Reveal>
              ))
            ) : (
              <Reveal>
                <div className="col-span-full rounded-3xl border border-border bg-card p-8 text-center">
                  <p className="text-muted-foreground">Team profiles coming soon.</p>
                </div>
              </Reveal>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
