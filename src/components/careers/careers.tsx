import { useState } from "react";
import { Reveal } from "@/components/landing/reveal";
import { useCmsData } from "@/lib/cms-context";
import {
  Briefcase,
  MapPin,
  Clock,
  ArrowRight,
  Sparkles,
  Search,
  HeartHandshake,
  Laptop,
  GraduationCap,
  TrendingUp,
  Shield,
  Coffee,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Position = {
  title: string;
  department: string;
  location: string;
  type: string;
  description?: string;
  body?: string;
  experience?: string;
};

type Benefit = { title: string; description?: string; body?: string; icon?: string };

type CareersCmsData = {
  hero?: { heading?: string; subheading?: string };
  culture?: { heading?: string; body?: string };
  benefits?: { heading?: string; items?: Benefit[] };
  positions?: { heading?: string; openings?: Position[] };
};

const BENEFIT_ICONS = [Laptop, HeartHandshake, TrendingUp, GraduationCap, Shield, Coffee];

const DEFAULT: CareersCmsData = {
  hero: {
    heading: "Build the everyday super app Nigeria deserves.",
    subheading:
      "Join a passionate team of builders, operators, and creators engineering the future of commerce, local services, and last-mile logistics across Africa.",
  },
  culture: {
    heading: "How we work and build together",
    body:
      "We value high agency, radical transparency, fast shipping, and customer obsession. Everyone at MyTijaara has direct ownership from day one. We solve genuine everyday problems for real Nigerian vendors, couriers, artisans, and families.",
  },
  benefits: {
    heading: "Perks & Benefits",
    items: [
      { title: "Competitive Pay & Equity", body: "Market-leading salaries with generous early employee stock options." },
      { title: "Comprehensive Healthcare", body: "Full medical, dental, and optical insurance for you and your direct dependents." },
      { title: "Hybrid & Remote Flexibility", body: "Work from our Lagos innovation hub or from your home office with modern gear stipends." },
      { title: "Annual Learning Stipend", body: "Dedicated budget for tech certifications, leadership conferences, and courses." },
      { title: "Wellness & Life Support", body: "Paid annual leave, parental leave, gym discounts, and mental health support." },
      { title: "Free MyTijaara Deliveries", body: "Monthly app credits and zero delivery fees across all partner restaurants and stores." },
    ],
  },
  positions: {
    heading: "Open Opportunities",
    openings: [
      {
        title: "Senior Full-Stack Engineer (PHP / React / TypeScript)",
        department: "Engineering",
        location: "Lagos / Remote (NG)",
        type: "Full-time",
        experience: "4+ years",
        body: "Design and scale high-throughput order dispatch, escrow payment pipelines, and real-time mapping engines.",
      },
      {
        title: "Senior Mobile Engineer (Flutter / React Native)",
        department: "Engineering",
        location: "Lagos / Remote (NG)",
        type: "Full-time",
        experience: "3+ years",
        body: "Lead the consumer and rider mobile applications, focusing on battery efficiency, offline caching, and instant notifications.",
      },
      {
        title: "Product Designer (UI / UX / Design Systems)",
        department: "Product",
        location: "Lagos, Nigeria",
        type: "Full-time",
        experience: "3+ years",
        body: "Design intuitive interfaces for shoppers, busy marketplace merchants, and on-the-road delivery riders.",
      },
      {
        title: "Merchant Operations & Onboarding Lead",
        department: "Operations",
        location: "Lagos, Nigeria",
        type: "Full-time",
        experience: "3+ years",
        body: "Manage partner vendor verification, restaurant menu digitalizations, and local artisan network quality controls.",
      },
      {
        title: "Growth & Lifecycle Marketing Manager",
        department: "Growth",
        location: "Lagos, Nigeria",
        type: "Full-time",
        experience: "3+ years",
        body: "Scale user acquisition, viral referral loops, automated email/SMS campaigns, and city-by-city launch activations.",
      },
      {
        title: "Customer Support & Trust Operations Specialist",
        department: "Operations",
        location: "Lagos, Nigeria",
        type: "Full-time",
        experience: "2+ years",
        body: "Provide 24/7 empathetic support and manage dispute resolutions for orders, deliveries, and artisan bookings.",
      },
    ],
  },
};

const DEPARTMENTS = ["All", "Engineering", "Product", "Operations", "Growth"];

export function Careers() {
  const cms = useCmsData("careers", DEFAULT);
  const hero = cms.hero ?? DEFAULT.hero!;
  const culture = cms.culture ?? DEFAULT.culture!;
  const benefits = cms.benefits ?? DEFAULT.benefits!;
  const positions = cms.positions ?? DEFAULT.positions!;

  const benefitItems = benefits.items && benefits.items.length > 0 ? benefits.items : DEFAULT.benefits!.items!;
  const openings = positions.openings && positions.openings.length > 0 ? positions.openings : DEFAULT.positions!.openings!;

  const [activeDept, setActiveDept] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredOpenings = openings.filter((p) => {
    const matchesDept = activeDept === "All" || p.department.toLowerCase() === activeDept.toLowerCase();
    const matchesSearch =
      !searchQuery.trim() ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.body && p.body.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesDept && matchesSearch;
  });

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-primary-gradient py-24 text-primary-foreground sm:py-32">
        <div className="pointer-events-none absolute -left-40 top-1/2 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-gold opacity-15 blur-3xl" />
        <div className="pointer-events-none absolute -right-40 top-10 h-[400px] w-[400px] rounded-full bg-primary-foreground/10 blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/15 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-gold">
              <Sparkles className="h-3.5 w-3.5" />
              Careers at MyTijaara
            </div>
            <h1 className="mt-5 font-display text-4xl font-extrabold tracking-tight sm:text-6xl">
              {hero.heading}
            </h1>
            {hero.subheading && (
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-primary-foreground/90 sm:text-xl">
                {hero.subheading}
              </p>
            )}
          </Reveal>
        </div>
      </section>

      {/* Culture & Philosophy */}
      <section className="bg-background py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center">
          <Reveal>
            <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary text-xs font-semibold px-3 py-1 mb-3">
              Our Culture
            </Badge>
            <h2 className="font-display text-3xl font-bold sm:text-4xl text-foreground">
              {culture.heading}
            </h2>
            <p className="mt-6 text-base sm:text-lg leading-relaxed text-muted-foreground">
              {culture.body}
            </p>
          </Reveal>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="bg-surface py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal>
            <div className="text-center">
              <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary text-xs font-semibold px-3 py-1">
                Life at MyTijaara
              </Badge>
              <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl text-foreground">
                {benefits.heading}
              </h2>
            </div>
          </Reveal>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {benefitItems.map((b, i) => {
              const Icon = BENEFIT_ICONS[i % BENEFIT_ICONS.length];
              const body = b.description ?? b.body ?? "";
              return (
                <Reveal key={b.title} delay={i * 40}>
                  <div className="group h-full rounded-3xl border border-border bg-card p-7 transition-all duration-300 hover:-translate-y-2 hover:border-primary/30 hover:shadow-elegant">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary transition-all duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-6 font-display text-lg font-bold transition-colors duration-200 group-hover:text-primary">
                      {b.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {body}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Open Positions Section */}
      <section id="openings" className="bg-background py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <Reveal>
            <div className="text-center">
              <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary text-xs font-semibold px-3 py-1">
                Join the Mission
              </Badge>
              <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl text-foreground">
                {positions.heading}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Explore open roles across engineering, operations, growth, and customer experience.
              </p>
            </div>
          </Reveal>

          {/* Department Filter & Search Bar */}
          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {DEPARTMENTS.map((dept) => (
                <Button
                  key={dept}
                  type="button"
                  variant={activeDept === dept ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveDept(dept)}
                  className={`rounded-full text-xs font-semibold ${
                    activeDept === dept ? "bg-primary text-primary-foreground" : ""
                  }`}
                >
                  {dept}
                </Button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search positions..."
                className="pl-9 h-9 rounded-full text-xs"
              />
            </div>
          </div>

          {/* Openings List */}
          <div className="mt-8 space-y-4">
            {filteredOpenings.length > 0 ? (
              filteredOpenings.map((p, i) => {
                const body = p.description ?? p.body ?? "";
                return (
                  <Reveal key={p.title} delay={i * 50}>
                    <a
                      href={`mailto:careers@mytijaara.com?subject=Application: ${p.title}`}
                      className="group block rounded-3xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/40 hover:shadow-elegant"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex-1">
                          <div className="flex items-start gap-4">
                            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                              <Briefcase className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-display text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                                  {p.title}
                                </h3>
                                {p.experience && (
                                  <Badge variant="secondary" className="text-[10px] font-bold">
                                    {p.experience}
                                  </Badge>
                                )}
                              </div>

                              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1 font-medium text-foreground/80">
                                  <Briefcase className="h-3.5 w-3.5 text-primary" />
                                  {p.department}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                                  {p.location}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5 text-amber-600" />
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

                        <div className="shrink-0 self-end sm:self-center">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-2 text-xs font-bold text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                            Apply via Email <ArrowRight className="h-3.5 w-3.5" />
                          </span>
                        </div>
                      </div>
                    </a>
                  </Reveal>
                );
              })
            ) : (
              <div className="rounded-3xl border border-dashed border-border p-12 text-center">
                <Briefcase className="mx-auto h-10 w-10 text-muted-foreground/60" />
                <h3 className="mt-3 text-base font-bold text-foreground">No matching positions found</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Try adjusting your search query or department filter.
                </p>
              </div>
            )}
          </div>

          <Reveal delay={200}>
            <div className="mt-12 rounded-3xl border border-border bg-card p-8 text-center shadow-soft">
              <h3 className="font-display text-lg font-bold text-foreground">Don't see your specific role?</h3>
              <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
                We are always excited to meet exceptional engineers, designers, operators, and growth leaders.
              </p>
              <div className="mt-5">
                <a
                  href="mailto:careers@mytijaara.com?subject=General Application: Open Talent Network"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-xs font-bold text-primary-foreground transition-transform hover:scale-105"
                >
                  Send a General Application <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}

