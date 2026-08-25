import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Download,
  Smartphone,
  Apple,
  Globe,
  Store,
  Bike,
  QrCode,
  ShieldCheck,
  Zap,
  Sparkles,
  Wrench,
  UtensilsCrossed,
  ShoppingBag,
  Pill,
  Package,
  Car,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  HelpCircle,
  Share2,
  Copy,
  Check,
} from "lucide-react";
import QRCode from "qrcode";
import { serverGet } from "@/lib/api";
import { settingsApi } from "@/lib/api/settings";
import type { CmsSection } from "@/lib/api";
import type { PublicBranding } from "@/lib/api/settings";
import { normalizeLaunchConfig } from "@/lib/launch/config";
import { LaunchStateProvider } from "@/components/launch/launch-state-provider";
import { PublicLayout } from "@/components/landing/public-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics/track";

export const Route = createFileRoute("/download")({
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
      { title: "Download MyTijaara App — Android, iOS & Web App | Everything in One Place" },
      {
        name: "description",
        content:
          "Download the MyTijaara app for Android and iOS. Order food, shop groceries & pharmacy items, book trusted artisans, send parcels, and rent cars across Nigeria.",
      },
    ],
  }),
  component: DownloadPage,
});

type DownloadCmsData = {
  badge?: string;
  heading?: string;
  subheading?: string;
  playStore?: {
    enabled?: boolean;
    comingSoon?: boolean;
    url?: string;
    label?: string;
  };
  appStore?: {
    enabled?: boolean;
    comingSoon?: boolean;
    url?: string;
    label?: string;
  };
  webApp?: {
    enabled?: boolean;
    url?: string;
    label?: string;
    description?: string;
  };
  vendorPartner?: {
    enabled?: boolean;
    url?: string;
    label?: string;
    description?: string;
  };
  riderPartner?: {
    enabled?: boolean;
    url?: string;
    label?: string;
    description?: string;
  };
};

const DEFAULT_DOWNLOAD_CMS: DownloadCmsData = {
  badge: "Get the App",
  heading: "Experience MyTijaara on your device",
  subheading:
    "Order food, shop groceries & pharmacy items, book trusted artisans, send parcels, and rent cars — all in one super app built for Nigeria.",
  playStore: {
    enabled: true,
    comingSoon: false,
    url: "https://play.google.com/store/apps/details?id=com.mytijaara.app",
    label: "Google Play",
  },
  appStore: {
    enabled: true,
    comingSoon: true,
    url: "https://apps.apple.com/app/mytijaara/id000000000",
    label: "App Store",
  },
  webApp: {
    enabled: true,
    url: "https://app.mytijaara.com",
    label: "Order Online (Web App)",
    description: "No download needed. Access all restaurants, stores, and services directly from any browser.",
  },
  vendorPartner: {
    enabled: true,
    url: "https://dashboard.mytijaara.com",
    label: "Join as a Business Partner",
    description: "Sell food, groceries, pharmacy, or retail goods to thousands of ready customers in your city.",
  },
  riderPartner: {
    enabled: true,
    url: "https://dashboard.mytijaara.com",
    label: "Earn as a Delivery Rider",
    description: "Flexible schedules, weekly payouts, and steady daily delivery requests across town.",
  },
};

const APP_FEATURES = [
  {
    icon: UtensilsCrossed,
    title: "Hot Food Delivery",
    desc: "Order from your favourite local bukas and top fast-food chains delivered hot in under 35 mins.",
    color: "bg-orange-500/10 text-orange-600 border-orange-200",
  },
  {
    icon: ShoppingBag,
    title: "Supermarket & Groceries",
    desc: "Fresh vegetables, packaged food, drinks, and household supplies packed and delivered.",
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  },
  {
    icon: Pill,
    title: "Pharmacy & Health",
    desc: "Prescriptions, over-the-counter medicine, supplements, and first-aid supplies with discreet delivery.",
    color: "bg-blue-500/10 text-blue-600 border-blue-200",
  },
  {
    icon: Wrench,
    title: "Vetted Local Artisans",
    desc: "Book trusted plumbers, electricians, mechanics, and painters with verified reviews and fixed pricing.",
    color: "bg-amber-500/10 text-amber-600 border-amber-200",
  },
  {
    icon: Package,
    title: "Same-Day Parcel Delivery",
    desc: "Send documents and parcels across town with real-time GPS tracking and recipient PIN verification.",
    color: "bg-purple-500/10 text-purple-600 border-purple-200",
  },
  {
    icon: ShieldCheck,
    title: "Secure Escrow Payments",
    desc: "Your money stays in automated escrow until you inspect and confirm your order or service.",
    color: "bg-green-500/10 text-green-700 border-green-200",
  },
];

const DOWNLOAD_FAQS = [
  {
    q: "Is the MyTijaara app free to download?",
    a: "Yes! The MyTijaara app is 100% free to download on Google Play and Apple App Store. You only pay for the food, products, or services you order.",
  },
  {
    q: "What if the iOS App Store version is marked as coming soon?",
    a: "You can immediately tap 'Order Online' to use our full-featured Web App at app.mytijaara.com on Safari or Chrome on your iPhone. It works seamlessly and you can even add it to your Home Screen.",
  },
  {
    q: "How do I sign up as a Vendor or Rider?",
    a: "Tap the 'Join as a Partner' or 'Earn as a Rider' card below. You will be redirected to the MyTijaara Partner Portal at dashboard.mytijaara.com where you can submit your business details or rider documents in under 5 minutes.",
  },
  {
    q: "What cities are currently supported?",
    a: "We are launching in major hubs across Lagos, Abuja, Ibadan, and Port Harcourt, with fast ongoing rollout to other Nigerian states.",
  },
  {
    q: "How do escrow payments work on MyTijaara?",
    a: "When you place an order or hire an artisan, your payment is held securely in escrow. The seller or service provider is only paid once you confirm that the service was executed properly or your package arrived safely.",
  },
];

function DownloadPage() {
  const { launchConfig, serverNow, cms, branding } = Route.useLoaderData();
  const downloadCms: DownloadCmsData = (cms.download?.data as DownloadCmsData) ?? DEFAULT_DOWNLOAD_CMS;

  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const downloadUrl = typeof window !== "undefined" ? window.location.href : "https://mytijaara.com/download";
    QRCode.toDataURL(downloadUrl, {
      width: 320,
      margin: 1.5,
      color: {
        dark: "#004A28",
        light: "#FFFFFF",
      },
    })
      .then(setQrDataUrl)
      .catch(() => {});
  }, []);

  const handleCopyLink = () => {
    const url = typeof window !== "undefined" ? window.location.href : "https://mytijaara.com/download";
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success("Download page link copied!");
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const playStore = downloadCms.playStore ?? DEFAULT_DOWNLOAD_CMS.playStore!;
  const appStore = downloadCms.appStore ?? DEFAULT_DOWNLOAD_CMS.appStore!;
  const webApp = downloadCms.webApp ?? DEFAULT_DOWNLOAD_CMS.webApp!;
  const vendorPartner = downloadCms.vendorPartner ?? DEFAULT_DOWNLOAD_CMS.vendorPartner!;
  const riderPartner = downloadCms.riderPartner ?? DEFAULT_DOWNLOAD_CMS.riderPartner!;

  return (
    <LaunchStateProvider initialConfig={launchConfig} initialNow={serverNow}>
      <PublicLayout cmsData={cms} branding={branding}>
        <main className="min-h-screen pb-24">
          {/* Hero Section */}
          <section className="relative overflow-hidden bg-primary-gradient pt-28 pb-20 text-primary-foreground sm:pt-36 sm:pb-28">
            <div className="pointer-events-none absolute -left-32 top-10 h-96 w-96 rounded-full bg-gold/15 blur-3xl" />
            <div className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-primary-foreground/10 blur-3xl" />

            <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
              <div className="grid items-center gap-12 lg:grid-cols-12">
                {/* Hero Left Content */}
                <div className="text-center lg:col-span-7 lg:text-left">
                  <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/15 px-4 py-1.5 text-xs font-bold tracking-wide uppercase text-gold">
                    <Sparkles className="h-3.5 w-3.5" />
                    {downloadCms.badge || "Get the App"}
                  </div>

                  <h1 className="mt-5 font-display text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                    {downloadCms.heading || "Experience MyTijaara on your device"}
                  </h1>

                  <p className="mt-5 text-lg leading-relaxed text-primary-foreground/90 sm:text-xl">
                    {downloadCms.subheading ||
                      "Order food, shop groceries & pharmacy items, book trusted artisans, send parcels, and rent cars — all in one super app."}
                  </p>

                  {/* Primary Download Badges */}
                  <div className="mt-8 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
                    {/* Google Play Store */}
                    {playStore.enabled !== false && (
                      <div className="flex flex-col items-center sm:items-start">
                        {playStore.comingSoon ? (
                          <div className="relative inline-flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-6 py-3.5 opacity-80 backdrop-blur">
                            <Smartphone className="h-7 w-7 text-gold" />
                            <div className="text-left">
                              <div className="text-[11px] font-medium text-white/75">COMING SOON ON</div>
                              <div className="text-base font-bold text-white">Google Play</div>
                            </div>
                            <Badge variant="outline" className="ml-2 border-gold/40 bg-gold/20 text-[10px] text-gold">
                              In Review
                            </Badge>
                          </div>
                        ) : (
                          <a
                            href={playStore.url || "https://play.google.com/store/apps/details?id=com.mytijaara.app"}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => trackEvent("download_click", { platform: "google_play" })}
                            className="group inline-flex items-center gap-3.5 rounded-2xl bg-white px-6 py-3.5 text-slate-900 shadow-xl transition-all duration-300 hover:scale-[1.03] hover:bg-gold hover:text-slate-950"
                          >
                            <svg className="h-7 w-7 fill-current" viewBox="0 0 24 24">
                              <path d="M3.609 1.814L13.793 12 3.61 22.186a2.37 2.37 0 0 1-.61-.716V2.53c.184-.286.39-.533.61-.716zm11.602 11.604l2.585 2.586-12.022 6.94 9.437-9.526zm2.585-2.836l-2.585 2.586-9.437-9.526 12.022 6.94zm1.42 1.418a1.5 1.5 0 0 1 0 2.002l-1.02 1.02-2.12-2.02 2.12-2.02 1.02 1.018z" />
                            </svg>
                            <div className="text-left">
                              <div className="text-[10px] font-bold tracking-wider uppercase opacity-75">GET IT ON</div>
                              <div className="text-base font-extrabold leading-tight">Google Play</div>
                            </div>
                          </a>
                        )}
                      </div>
                    )}

                    {/* Apple App Store */}
                    {appStore.enabled !== false && (
                      <div className="flex flex-col items-center sm:items-start">
                        {appStore.comingSoon ? (
                          <div className="relative inline-flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-6 py-3.5 opacity-85 backdrop-blur">
                            <Apple className="h-7 w-7 text-white" />
                            <div className="text-left">
                              <div className="text-[11px] font-medium text-white/75">DOWNLOAD ON THE</div>
                              <div className="text-base font-bold text-white">App Store</div>
                            </div>
                            <Badge variant="outline" className="ml-2 border-gold/40 bg-gold/20 text-[10px] text-gold">
                              Coming Soon
                            </Badge>
                          </div>
                        ) : (
                          <a
                            href={appStore.url || "https://apps.apple.com/app/mytijaara/id000000000"}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => trackEvent("download_click", { platform: "app_store" })}
                            className="group inline-flex items-center gap-3.5 rounded-2xl bg-white px-6 py-3.5 text-slate-900 shadow-xl transition-all duration-300 hover:scale-[1.03] hover:bg-gold hover:text-slate-950"
                          >
                            <Apple className="h-7 w-7 fill-current" />
                            <div className="text-left">
                              <div className="text-[10px] font-bold tracking-wider uppercase opacity-75">DOWNLOAD ON THE</div>
                              <div className="text-base font-extrabold leading-tight">App Store</div>
                            </div>
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Web App Alternate Callout */}
                  {webApp.enabled !== false && (
                    <div className="mt-6 flex items-center justify-center gap-2 text-sm text-primary-foreground/90 lg:justify-start">
                      <span>Prefer browser ordering?</span>
                      <a
                        href={webApp.url || "https://app.mytijaara.com"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-gold underline underline-offset-4 transition-colors hover:text-white"
                      >
                        Order Online at app.mytijaara.com <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Hero Right: QR Code Card */}
                <div className="lg:col-span-5">
                  <div className="relative mx-auto max-w-sm rounded-3xl border border-white/20 bg-white/10 p-6 text-center backdrop-blur-md shadow-2xl">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gold px-3.5 py-1 text-xs font-bold text-slate-950 shadow">
                      Instant Mobile Access
                    </div>

                    <div className="mt-2 text-sm font-semibold text-white">Scan with your Phone Camera</div>
                    <p className="mt-1 text-xs text-white/80">Opens the download page or web app on your phone instantly.</p>

                    <div className="mt-4 flex justify-center">
                      <div className="rounded-2xl bg-white p-3.5 shadow-inner">
                        {qrDataUrl ? (
                          <img
                            src={qrDataUrl}
                            alt="Scan to download MyTijaara app"
                            className="h-44 w-44 object-contain"
                          />
                        ) : (
                          <div className="grid h-44 w-44 place-items-center bg-muted/40">
                            <QrCode className="h-12 w-12 animate-pulse text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleCopyLink}
                        className="h-8 gap-1.5 rounded-full bg-white/20 text-xs text-white hover:bg-white/30"
                      >
                        {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        {copiedLink ? "Link Copied" : "Copy Page Link"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Quick Access Matrix (Web App, Vendors, Riders) */}
          <section className="relative -mt-8 mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid gap-6 md:grid-cols-3">
              {/* Web App Card */}
              {webApp.enabled !== false && (
                <div className="group flex flex-col justify-between rounded-3xl border border-border bg-card p-6 shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:shadow-elegant">
                  <div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Globe className="h-6 w-6" />
                    </div>
                    <h3 className="mt-4 font-display text-lg font-bold text-foreground">
                      {webApp.label || "Order Online (Web App)"}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {webApp.description ||
                        "Browse restaurants, pharmacy items, groceries, and book services directly in your phone or desktop browser."}
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-border/60">
                    <a
                      href={webApp.url || "https://app.mytijaara.com"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-bold text-primary transition-colors group-hover:text-primary/80"
                    >
                      Open Web App <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              )}

              {/* Vendor Portal Card */}
              {vendorPartner.enabled !== false && (
                <div className="group flex flex-col justify-between rounded-3xl border border-border bg-card p-6 shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:shadow-elegant">
                  <div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                      <Store className="h-6 w-6" />
                    </div>
                    <h3 className="mt-4 font-display text-lg font-bold text-foreground">
                      {vendorPartner.label || "Join as a Business Partner"}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {vendorPartner.description ||
                        "List your restaurant, grocery shop, pharmacy, or retail business to reach thousands of buyers."}
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-border/60">
                    <a
                      href={vendorPartner.url || "https://dashboard.mytijaara.com"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 transition-colors group-hover:text-emerald-800"
                    >
                      Partner Portal <ChevronRight className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              )}

              {/* Delivery Rider Fleet Card */}
              {riderPartner.enabled !== false && (
                <div className="group flex flex-col justify-between rounded-3xl border border-border bg-card p-6 shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:shadow-elegant">
                  <div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-700">
                      <Bike className="h-6 w-6" />
                    </div>
                    <h3 className="mt-4 font-display text-lg font-bold text-foreground">
                      {riderPartner.label || "Earn as a Delivery Rider"}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {riderPartner.description ||
                        "Deliver food, groceries, and parcels on your motorcycle, bicycle, or car with weekly prompt payouts."}
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-border/60">
                    <a
                      href={riderPartner.url || "https://dashboard.mytijaara.com"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-bold text-amber-800 transition-colors group-hover:text-amber-900"
                    >
                      Rider Onboarding <ChevronRight className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* App Features & Capabilities */}
          <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <div className="text-center">
              <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary text-xs font-semibold px-3 py-1">
                Everything Inside
              </Badge>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                What you can do with MyTijaara
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground">
                Built specifically for how commerce, services, and daily errands happen in Nigerian cities.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {APP_FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="rounded-3xl border border-border/70 bg-card p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-soft"
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${f.color}`}>
                    <f.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-bold text-foreground">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Download & Installation FAQ */}
          <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
            <div className="rounded-3xl border border-border/70 bg-surface/50 p-8 sm:p-12">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <HelpCircle className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground">Frequently Asked Questions</h2>
                  <p className="text-xs text-muted-foreground">Everything you need to know about getting started.</p>
                </div>
              </div>

              <Accordion type="single" collapsible className="mt-6">
                {DOWNLOAD_FAQS.map((faq, i) => (
                  <AccordionItem key={i} value={`faq-${i}`}>
                    <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline">
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </section>

          {/* Referral Callout Banner */}
          <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
            <div className="relative overflow-hidden rounded-3xl bg-primary px-8 py-10 text-primary-foreground sm:px-12">
              <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-gold/20 blur-3xl" />
              <div className="relative flex flex-col items-center justify-between gap-6 text-center sm:flex-row sm:text-left">
                <div>
                  <Badge className="bg-gold text-slate-950 font-bold mb-2">Earn ₦500 per friend</Badge>
                  <h3 className="font-display text-2xl font-bold sm:text-3xl">Invite friends to MyTijaara</h3>
                  <p className="mt-1 text-sm text-primary-foreground/80 max-w-xl">
                    Share your unique referral link to earn wallet credits and unlock exclusive VIP perks at launch.
                  </p>
                </div>
                <Link
                  to="/referral-rewards"
                  className="shrink-0 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-slate-900 shadow-lg transition-transform hover:scale-105 hover:bg-gold"
                >
                  View Referral Perks <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>
        </main>
      </PublicLayout>
    </LaunchStateProvider>
  );
}
