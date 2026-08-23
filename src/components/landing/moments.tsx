import { Coffee, Sun, Sunset, Moon } from "lucide-react";
import { Reveal } from "./reveal";
import morningImg from "@/assets/moment-morning.jpg";
import afternoonImg from "@/assets/moment-afternoon.jpg";
import eveningImg from "@/assets/moment-evening.jpg";
import nightImg from "@/assets/moment-night.jpg";
import { useCmsData } from "@/lib/cms-context";

type MomentsCmsData = {
  badge?: string;
  heading?: string;
  subheading?: string;
};

const DEFAULT_MOMENTS: MomentsCmsData = {
  badge: "Everyday moments",
  heading: "A day with MyTijaara.",
  subheading: "From your first cup to your last errand — MyTijaara moves with you.",
};

const MOMENTS = [
  {
    icon: Coffee, tag: "Morning", title: "Order breakfast.",
    body: "Hot jollof, akara, or your favorite coffee — delivered before the day begins.",
    img: morningImg, tint: "from-[oklch(0.85_0.12_82)]/40",
  },
  {
    icon: Sun, tag: "Afternoon", title: "Send a parcel.",
    body: "Get documents and packages across town in hours, tracked from pickup to drop-off.",
    img: afternoonImg, tint: "from-[oklch(0.7_0.12_140)]/40",
  },
  {
    icon: Sunset, tag: "Evening", title: "Book an electrician.",
    body: "Trusted, verified artisans arrive at your door — plumbers, electricians, cleaners and more.",
    img: eveningImg, tint: "from-[oklch(0.7_0.15_50)]/40",
  },
  {
    icon: Moon, tag: "Night", title: "Order medicine.",
    body: "Late-night pharmacy runs, sorted. Prescriptions and essentials, right to your door.",
    img: nightImg, tint: "from-[oklch(0.4_0.09_240)]/40",
  },
];

export function Moments() {
  const cms = useCmsData("moments", DEFAULT_MOMENTS);
  if (!cms) return null;

  return (
    <section id="moments" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold text-primary">
              {cms.badge ?? DEFAULT_MOMENTS.badge}
            </span>
            <h2 className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-5xl">
              {cms.heading ?? DEFAULT_MOMENTS.heading}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {cms.subheading ?? DEFAULT_MOMENTS.subheading}
            </p>
          </Reveal>
        </div>

        <div className="mt-16 space-y-16 lg:space-y-24">
          {MOMENTS.map((m, i) => {
            const reverse = i % 2 === 1;
            const Icon = m.icon;
            return (
              <Reveal key={m.tag} delay={80}>
                <div
                  className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-16 ${
                    reverse ? "lg:[&>div:first-child]:order-2" : ""
                  }`}
                >
                  <div>
                    <div className="relative overflow-hidden rounded-4xl border border-border shadow-elegant">
                      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${m.tint} to-transparent`} />
                      <img
                        src={m.img}
                        alt={m.title}
                        width={800}
                        height={800}
                        loading="lazy"
                        className="aspect-[4/3] w-full object-cover"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-semibold uppercase tracking-widest text-gold">
                        {m.tag}
                      </span>
                    </div>
                    <h3 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                      {m.title}
                    </h3>
                    <p className="mt-4 max-w-md text-lg leading-relaxed text-muted-foreground">
                      {m.body}
                    </p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal>
          <div className="mt-20 flex flex-col items-center gap-4">
            <span className="h-px w-16 bg-gradient-to-r from-transparent via-gold to-transparent" />
            <p className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              All from{" "}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-primary via-primary to-gold bg-clip-text text-transparent">
                  MyTijaara
                </span>
                <span className="absolute -bottom-1 left-0 h-1 w-full rounded-full bg-gradient-to-r from-primary/40 to-gold/40" />
              </span>
              <span className="text-foreground">.</span>
            </p>
            <p className="max-w-sm text-center text-sm text-muted-foreground">
              One app. Every moment of your day, handled with care.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
