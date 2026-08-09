import { useState } from "react";
import {
  MapPin,
  Phone,
  Mail,
  Building,
  ShieldCheck,
  Lock,
  ArrowRight,
  Smartphone,
  Sparkles,
  Heart,
  Globe,
} from "lucide-react";
import { SOCIAL_ICON_MAP, SOCIAL_PLATFORMS } from "./social-icons";
import { Logo } from "./logo";
import { useLaunch } from "@/components/launch/launch-state-provider";
import { useCmsData, useBranding } from "@/lib/cms-context";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type FooterLink = { label: string; href: string };
type FooterColumn = { title?: string; h?: string; links?: FooterLink[]; l?: FooterLink[] };
type FooterCmsData = {
  tagline?: string;
  copyright?: string;
  columns?: FooterColumn[];
};

const DEFAULT_FOOTER: FooterCmsData = {
  tagline: "Everything you need, all in one place. Built for everyday life in Nigeria.",
  copyright: "Made with love in Nigeria.",
  columns: [
    {
      h: "Product",
      links: [
        { label: "Everyday moments", href: "#moments" },
        { label: "What you can do", href: "#services" },
        { label: "How it works", href: "#how" },
        { label: "FAQ", href: "#faq" },
        { label: "Referral Perks", href: "/referral-rewards" },
      ],
    },
    {
      h: "Partners",
      links: [
        { label: "Vendors", href: "#partners" },
        { label: "Riders", href: "#partners" },
        { label: "Artisans", href: "#partners" },
        { label: "Contact sales", href: "mailto:hello@mytijaara.com" },
      ],
    },
    {
      h: "Company",
      links: [
        { label: "About", href: "/about" },
        { label: "Careers", href: "/careers" },
        { label: "Privacy policy", href: "/privacy" },
        { label: "Terms of service", href: "/terms" },
        { label: "Cookie policy", href: "/cookies" },
      ],
    },
  ],
};

/** App Store badge component — renders active link if URL exists, or polished coming-soon badge. */
function AppStoreBadge({
  store,
  href,
}: {
  store: "ios" | "android";
  href?: string;
}) {
  const label = store === "ios" ? "App Store" : "Google Play";
  const sub = store === "ios" ? "Download on the" : "GET IT ON";

  const inner = (
    <div className="group relative flex items-center gap-3 rounded-2xl border border-border/80 bg-card/70 px-4 py-2.5 shadow-sm backdrop-blur-md transition-all duration-300 hover:border-primary/50 hover:bg-card hover:shadow-md">
      {store === "ios" ? (
        <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 fill-foreground transition-transform group-hover:scale-110" aria-hidden="true">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 fill-foreground transition-transform group-hover:scale-110" aria-hidden="true">
          <path d="M3.18 23.76a2 2 0 0 0 2.17-.22l.06-.04 12.08-6.98-3.49-3.5-10.82 10.74zm16.7-9.93-2.55-2.55 2.55-2.55c.74.74 1.33 1.62 1.33 2.55s-.59 1.81-1.33 2.55zM3.18.24l10.82 10.74L17 7.48 4.41.46A2 2 0 0 0 3.18.24zM2 1.5c-.44.48-.72 1.11-.72 1.82v17.36c0 .71.28 1.34.72 1.82L2.09 22.6l9.73-9.73v-.23L2.09 2.89 2 2.5z" />
        </svg>
      )}
      <div className="text-left leading-tight min-w-0">
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{sub}</div>
        <div className="text-xs font-bold text-foreground truncate">{label}</div>
      </div>
      {!href && (
        <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-semibold text-primary">
          Soon
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" aria-label={`Download MyTijaara on ${label}`}>
        {inner}
      </a>
    );
  }

  return (
    <div title={`${label} app coming soon`} aria-label={`${label} — coming soon`}>
      {inner}
    </div>
  );
}

export function Footer() {
  const { now } = useLaunch();
  const year = new Date(now).getFullYear();

  const footerCms = useCmsData("footer", DEFAULT_FOOTER);
  const branding = useBranding();
  const { social, supportEmail, contactEmail, phone, launchCity, address, iosAppUrl, androidAppUrl } = branding;

  const tagline = footerCms.tagline ?? DEFAULT_FOOTER.tagline;
  const columns =
    footerCms.columns && footerCms.columns.length > 0
      ? footerCms.columns
      : DEFAULT_FOOTER.columns!;

  // Map social links dynamically from branding settings
  const socials = SOCIAL_PLATFORMS.map((id) => ({
    id,
    href: social[id],
    ...SOCIAL_ICON_MAP[id],
  })).filter((s): s is typeof s & { href: string } => Boolean(s.href));

  // Determine target sales email
  const salesEmail = contactEmail || supportEmail || "hello@mytijaara.com";

  return (
    <footer className="relative border-t border-border/80 bg-gradient-to-b from-card via-background to-card/90 text-foreground overflow-hidden">
      {/* Subtle ambient light gradient background */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary/5 to-transparent" aria-hidden />

      {/* ─────────────────────────────────────────────────────────────
          LAYER 1 — CTA / BRAND STATEMENT BANNER
          ───────────────────────────────────────────────────────────── */}
      <section className="relative mx-auto max-w-7xl px-4 pt-12 pb-8 sm:px-6 sm:pt-16 sm:pb-12">
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary via-primary-dark to-slate-950 p-8 sm:p-12 text-white shadow-2xl">
          {/* Decorative ambient elements */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gold/15 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-primary-soft/30 blur-3xl" aria-hidden />

          <div className="relative z-10 flex flex-col items-center text-center max-w-3xl mx-auto">
            <Badge variant="outline" className="inline-flex items-center gap-1.5 border-white/20 bg-white/10 px-3.5 py-1 text-xs font-semibold text-gold backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-gold" /> Built for everyday life in Nigeria
            </Badge>

            <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl text-white">
              Everything you need. <br className="hidden sm:inline" />
              <span className="text-gold">All in one place.</span>
            </h2>

            <p className="mt-4 text-sm sm:text-base text-white/80 leading-relaxed max-w-2xl">
              Join thousands of vendors, artisans, riders, and customers reserving priority access to Nigeria's next-generation commerce & service ecosystem.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button
                asChild
                size="lg"
                className="bg-gold text-slate-950 hover:bg-gold/90 font-bold px-8 shadow-lg hover:shadow-gold/20 transition-all hover:scale-105 active:scale-95"
              >
                <a href="/#waitlist">
                  Join the Waitlist <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white backdrop-blur-md px-6"
              >
                <a href="/referral-rewards">
                  Explore Referral Perks
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          LAYER 2 — MAIN MULTI-COLUMN FOOTER
          ───────────────────────────────────────────────────────────── */}
      <section className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.8fr_1fr_1fr_1fr] lg:gap-12">
          
          {/* LEFT / BRAND & CONTACT COLUMN */}
          <div className="space-y-6">
            <Logo />
            <p className="text-sm leading-relaxed text-muted-foreground max-w-sm">
              {tagline}
            </p>

            {/* Dynamic Admin Settings Contact Info Block */}
            <div className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm backdrop-blur-sm space-y-2.5 text-xs text-muted-foreground">
              {launchCity && (
                <div className="flex items-center gap-2 text-foreground font-semibold">
                  <MapPin className="h-4 w-4 shrink-0 text-primary" />
                  <span>Launching first in <strong className="text-primary">{launchCity}</strong></span>
                </div>
              )}
              {address && (
                <div className="flex items-start gap-2">
                  <Building className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                  <span>{address}</span>
                </div>
              )}
              {phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <a href={`tel:${phone.replace(/\s+/g, "")}`} className="hover:text-primary transition-colors">
                    {phone}
                  </a>
                </div>
              )}
              {contactEmail && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <a href={`mailto:${contactEmail}`} className="hover:text-primary transition-colors">
                    {contactEmail}
                  </a>
                </div>
              )}
            </div>

            {/* ─────────────────────────────────────────────────────────────
                LAYER 3 — SOCIAL / COMMUNITY AREA (DESKTOP / TABLET)
                ───────────────────────────────────────────────────────────── */}
            {socials.length > 0 && (
              <div className="space-y-2.5">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Connect with MyTijaara
                </div>
                <div className="flex flex-wrap gap-2">
                  {socials.map(({ id, Icon, label, href }) => (
                    <a
                      key={id}
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`MyTijaara on ${label}`}
                      className="group grid h-10 w-10 place-items-center rounded-xl border border-border/80 bg-card text-muted-foreground shadow-sm transition-all duration-300 hover:scale-110 hover:border-primary/40 hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <Icon className="h-4.5 w-4.5 transition-transform group-hover:scale-110" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* DESKTOP NAVIGATION COLUMNS */}
          <div className="hidden sm:contents">
            {columns.map((col) => {
              const heading = col.h ?? col.title ?? "";
              const rawLinks = col.links ?? col.l ?? [];
              // Replace static sales mailto if custom contactEmail exists
              const links = rawLinks.map((it) =>
                it.label === "Contact sales" ? { ...it, href: `mailto:${salesEmail}` } : it
              );

              return (
                <div key={heading} className="space-y-4">
                  <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
                    {heading}
                  </h3>
                  <ul className="space-y-3">
                    {links.map((it) => (
                      <li key={it.label}>
                        <a
                          href={it.href}
                          className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
                        >
                          <span className="transition-transform group-hover:translate-x-1 duration-200">
                            {it.label}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* MOBILE ACCORDION NAVIGATION */}
          <div className="block sm:hidden col-span-full border-y border-border/60 py-2">
            <Accordion type="multiple" className="w-full">
              {columns.map((col, idx) => {
                const heading = col.h ?? col.title ?? "";
                const rawLinks = col.links ?? col.l ?? [];
                const links = rawLinks.map((it) =>
                  it.label === "Contact sales" ? { ...it, href: `mailto:${salesEmail}` } : it
                );

                return (
                  <AccordionItem key={heading} value={`col-${idx}`} className="border-border/40">
                    <AccordionTrigger className="font-display text-sm font-bold text-foreground py-3.5 hover:no-underline">
                      {heading}
                    </AccordionTrigger>
                    <AccordionContent>
                      <ul className="space-y-2.5 pb-2 pl-2">
                        {links.map((it) => (
                          <li key={it.label}>
                            <a
                              href={it.href}
                              className="text-sm text-muted-foreground hover:text-primary py-1 block"
                            >
                              {it.label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>

        </div>

        {/* ─────────────────────────────────────────────────────────────
            LAYER 4 — APP DOWNLOAD AREA
            ───────────────────────────────────────────────────────────── */}
        <div className="mt-12 rounded-3xl border border-border/70 bg-gradient-to-r from-card via-muted/20 to-card p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                <Smartphone className="h-4 w-4" /> Coming soon to your phone
              </div>
              <h3 className="font-display text-lg font-bold text-foreground">
                Get the MyTijaara app & take full control
              </h3>
              <p className="text-xs text-muted-foreground max-w-md">
                Order food, groceries, book trusted artisans and manage deliveries seamlessly on iOS and Android.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row shrink-0">
              <AppStoreBadge store="ios" href={iosAppUrl || undefined} />
              <AppStoreBadge store="android" href={androidAppUrl || undefined} />
            </div>
          </div>
        </div>

      </section>

      {/* ─────────────────────────────────────────────────────────────
          LAYER 5 — COHESIVE TRUST / SECURITY STRIP
          ───────────────────────────────────────────────────────────── */}
      <div className="border-t border-border/60 bg-muted/30 py-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4 text-xs font-medium text-muted-foreground sm:px-6">
          <div className="flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-emerald-600" />
            <span>SSL Secured</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-emerald-600" />
            <span>Built in Nigeria 🇳🇬</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>NDPR Compliant</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>PCI-DSS Ready</span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          LAYER 6 — BOTTOM BAR (LEGAL & COPYRIGHT WITH SAFE AREA)
          ───────────────────────────────────────────────────────────── */}
      <div className="border-t border-border/60 bg-card py-6 pb-28 sm:pb-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 text-center sm:text-left">
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            © {year} MyTijaara Ltd. Made with <Heart className="h-3.5 w-3.5 fill-red-500 text-red-500 inline" /> in Nigeria.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <a href="/privacy" className="hover:text-primary transition-colors">
              Privacy Policy
            </a>
            <a href="/terms" className="hover:text-primary transition-colors">
              Terms of Service
            </a>
            <a href="/cookies" className="hover:text-primary transition-colors">
              Cookie Policy
            </a>
            {supportEmail ? (
              <a href={`mailto:${supportEmail}`} className="hover:text-primary transition-colors">
                Support
              </a>
            ) : (
              <a href="mailto:support@mytijaara.com" className="hover:text-primary transition-colors">
                Support
              </a>
            )}
            {contactEmail ? (
              <a href={`mailto:${contactEmail}`} className="hover:text-primary transition-colors">
                Contact
              </a>
            ) : (
              <a href="mailto:hello@mytijaara.com" className="hover:text-primary transition-colors">
                Contact
              </a>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
