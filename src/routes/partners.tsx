import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Store,
  Bike,
  Wrench,
  TrendingUp,
  ShieldCheck,
  Zap,
  Sparkles,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  Users,
  DollarSign,
  Calculator,
  ArrowRight,
} from "lucide-react";
import { serverGet } from "@/lib/api";
import { settingsApi } from "@/lib/api/settings";
import type { CmsSection } from "@/lib/api";
import type { PublicBranding } from "@/lib/api/settings";
import { normalizeLaunchConfig } from "@/lib/launch/config";
import { LaunchStateProvider } from "@/components/launch/launch-state-provider";
import { PublicLayout } from "@/components/landing/public-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

export const Route = createFileRoute("/partners")({
  loader: async () => {
    const [launchRaw, cmsRaw, brandingResult] = await Promise.all([
      serverGet<unknown>("/launch-config").catch(() => null),
      serverGet<Record<string, CmsSection>>("/cms").catch(() => ({})),
      settingsApi.publicSettings().catch(() => null),
    ]);
    const cms = (cmsRaw as Record<string, CmsSection>) ?? {};
    const branding = (brandingResult as { data: PublicBranding } | null)?.data;
    return {
      launchConfig: normalizeLaunchConfig(launchRaw),
      serverNow: Date.now(),
      cms,
      branding,
    };
  },
  head: () => ({
    meta: [
      { title: "Partner with MyTijaara — Vendors, Stores, Riders & Artisans" },
      {
        name: "description",
        content:
          "Grow your business on MyTijaara. Reach thousands of daily customers with prompt weekly payouts, low commissions, and dedicated merchant & rider tools.",
      },
    ],
  }),
  component: PartnersPage,
});

type PartnerType = "vendor" | "rider" | "artisan";

function PartnersPage() {
  const { launchConfig, serverNow, cms, branding } = Route.useLoaderData();
  const [partnerType, setPartnerType] = useState<PartnerType>("vendor");
  const [ordersPerDay, setOrdersPerDay] = useState(25);
  const [avgTicketPrice, setAvgTicketPrice] = useState(4500);

  // Vendor estimated monthly revenue
  const monthlyRevenue = ordersPerDay * avgTicketPrice * 30;
  // Rider estimated earnings (e.g. 15 trips/day * ₦900 avg fee * 26 days)
  const [tripsPerDay, setTripsPerDay] = useState(14);
  const riderMonthlyEarnings = tripsPerDay * 950 * 26;

  return (
    <LaunchStateProvider initialConfig={launchConfig} initialNow={serverNow}>
      <PublicLayout cmsData={cms} branding={branding}>
        <main className="min-h-screen pb-24">
          {/* Hero */}
          <section className="relative overflow-hidden bg-primary-gradient py-24 text-primary-foreground sm:py-32">
            <div className="pointer-events-none absolute -left-40 top-1/2 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-gold opacity-15 blur-3xl" />
            <div className="pointer-events-none absolute -right-40 top-10 h-[400px] w-[400px] rounded-full bg-primary-foreground/10 blur-3xl" />
            <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/15 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-gold">
                <Sparkles className="h-3.5 w-3.5" />
                Grow with MyTijaara
              </div>
              <h1 className="mt-5 font-display text-4xl font-extrabold tracking-tight sm:text-6xl">
                A better way to earn and scale your business
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-primary-foreground/90 sm:text-xl">
                Whether you run a restaurant, grocery store, pharmacy, or deliver parcels — MyTijaara connects you with thousands of paying customers in your city.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <a
                  href="https://dashboard.mytijaara.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-bold text-slate-950 shadow-xl transition-all hover:scale-105 hover:bg-gold"
                >
                  Join Partner Portal <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </section>

          {/* Partner Roles Selector */}
          <section className="relative -mt-10 mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid gap-6 md:grid-cols-3">
              {/* Vendors */}
              <div
                onClick={() => setPartnerType("vendor")}
                className={`cursor-pointer rounded-3xl border p-7 shadow-soft transition-all duration-300 ${
                  partnerType === "vendor"
                    ? "border-primary bg-primary/5 ring-2 ring-primary shadow-elegant"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                  <Store className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-display text-xl font-bold text-foreground">Restaurants & Stores</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Sell cooked food, fresh groceries, supermarket items, and pharmacy goods with zero upfront listing fees.
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                  Select Calculator <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>

              {/* Riders */}
              <div
                onClick={() => setPartnerType("rider")}
                className={`cursor-pointer rounded-3xl border p-7 shadow-soft transition-all duration-300 ${
                  partnerType === "rider"
                    ? "border-primary bg-primary/5 ring-2 ring-primary shadow-elegant"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/10 text-amber-700">
                  <Bike className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-display text-xl font-bold text-foreground">Dispatch Riders</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Deliver hot food and same-day packages with guaranteed hourly order density, prompt payouts, and rider bonuses.
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-amber-800">
                  Select Calculator <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>

              {/* Artisans */}
              <div
                onClick={() => setPartnerType("artisan")}
                className={`cursor-pointer rounded-3xl border p-7 shadow-soft transition-all duration-300 ${
                  partnerType === "artisan"
                    ? "border-primary bg-primary/5 ring-2 ring-primary shadow-elegant"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-500/10 text-blue-600">
                  <Wrench className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-display text-xl font-bold text-foreground">Verified Artisans</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Get booked for plumbing, electrical works, car repairs, and home maintenance with 100% escrow payment protection.
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-blue-700">
                  View Benefits <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
          </section>

          {/* Interactive Earnings Calculator */}
          <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
            <div className="rounded-3xl border border-border bg-card p-8 shadow-soft sm:p-12">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Calculator className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
                    {partnerType === "vendor"
                      ? "Merchant Revenue Estimator"
                      : partnerType === "rider"
                      ? "Rider Monthly Earnings Estimator"
                      : "Artisan Booking Potential"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Estimate your potential gross monthly volume on the MyTijaara platform.
                  </p>
                </div>
              </div>

              {partnerType === "vendor" ? (
                <div className="mt-10 grid gap-8 md:grid-cols-12">
                  <div className="space-y-6 md:col-span-7">
                    <div>
                      <div className="flex justify-between text-xs font-bold">
                        <span>Daily Orders: {ordersPerDay} orders / day</span>
                      </div>
                      <Slider
                        value={[ordersPerDay]}
                        onValueChange={(val) => setOrdersPerDay(val[0])}
                        min={5}
                        max={150}
                        step={5}
                        className="mt-3"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-bold">
                        <span>Average Order Value: ₦{avgTicketPrice.toLocaleString()}</span>
                      </div>
                      <Slider
                        value={[avgTicketPrice]}
                        onValueChange={(val) => setAvgTicketPrice(val[0])}
                        min={1500}
                        max={25000}
                        step={500}
                        className="mt-3"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col justify-center rounded-2xl bg-primary/5 p-6 text-center border border-primary/20 md:col-span-5">
                    <div className="text-xs font-bold uppercase tracking-wider text-primary">Estimated Monthly Sales</div>
                    <div className="mt-2 font-display text-3xl font-black text-primary sm:text-4xl">
                      ₦{monthlyRevenue.toLocaleString()}
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Based on {ordersPerDay * 30} orders/month with zero upfront fixed software fees.
                    </p>
                    <a
                      href="https://dashboard.mytijaara.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-full bg-primary py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
                    >
                      Start Selling <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              ) : (
                <div className="mt-10 grid gap-8 md:grid-cols-12">
                  <div className="space-y-6 md:col-span-7">
                    <div>
                      <div className="flex justify-between text-xs font-bold">
                        <span>Daily Completed Deliveries: {tripsPerDay} trips / day</span>
                      </div>
                      <Slider
                        value={[tripsPerDay]}
                        onValueChange={(val) => setTripsPerDay(val[0])}
                        min={4}
                        max={30}
                        step={1}
                        className="mt-3"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Keep 100% of customer tips and earn additional weekend milestone bonuses.
                    </p>
                  </div>

                  <div className="flex flex-col justify-center rounded-2xl bg-amber-500/10 p-6 text-center border border-amber-500/20 md:col-span-5">
                    <div className="text-xs font-bold uppercase tracking-wider text-amber-800">Estimated Monthly Earnings</div>
                    <div className="mt-2 font-display text-3xl font-black text-amber-900 sm:text-4xl">
                      ₦{riderMonthlyEarnings.toLocaleString()}
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Based on {tripsPerDay * 26} trips/month with weekly bank settlements.
                    </p>
                    <a
                      href="https://dashboard.mytijaara.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-full bg-amber-600 py-2.5 text-xs font-bold text-white hover:bg-amber-700"
                    >
                      Apply as Rider <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* 4-Step Onboarding Roadmap */}
          <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
            <div className="text-center">
              <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary text-xs font-semibold px-3 py-1">
                Simple Onboarding
              </Badge>
              <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl text-foreground">
                Get live and start receiving orders in 4 steps
              </h2>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { step: "01", title: "Submit Business Info", desc: "Enter your store details or rider credentials online." },
                { step: "02", title: "Document Verification", desc: "Our team verifies your CAC/ID and menu within 24 hours." },
                { step: "03", title: "Menu / Profile Setup", desc: "Digitize your catalog and configure your opening hours." },
                { step: "04", title: "Receive Orders & Payouts", desc: "Go live, accept orders, and enjoy weekly bank deposits." },
              ].map((s) => (
                <div key={s.step} className="rounded-3xl border border-border bg-card p-6 shadow-soft">
                  <div className="font-display text-2xl font-black text-primary">{s.step}</div>
                  <h3 className="mt-3 font-display text-base font-bold text-foreground">{s.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
          </section>
        </main>
      </PublicLayout>
    </LaunchStateProvider>
  );
}
