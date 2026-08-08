import { createFileRoute } from "@tanstack/react-router";

import { serverGet } from "@/lib/api";
import { settingsApi } from "@/lib/api/settings";
import type { CmsSection, Faq, Testimonial } from "@/lib/api";
import type { PublicBranding } from "@/lib/api/settings";
import { normalizeLaunchConfig, type LaunchConfiguration } from "@/lib/launch/config";
import { CmsProvider } from "@/lib/cms-context";
import { LaunchStateProvider } from "@/components/launch/launch-state-provider";
import { LaunchCountdown } from "@/components/launch/launch-countdown";
import { Nav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { TrustedBy } from "@/components/landing/trusted-by";
import { Moments } from "@/components/landing/moments";
import { Services } from "@/components/landing/services";
import { Why } from "@/components/landing/why";
import { How } from "@/components/landing/how";
import { InsideTheApp } from "@/components/landing/inside-the-app";
import { BuiltForNigerians } from "@/components/landing/built-for-nigerians";
import { Partners } from "@/components/landing/partners";
import { WaitlistSection } from "@/components/landing/waitlist-section";
import { FAQ } from "@/components/landing/faq";
import { Footer } from "@/components/landing/footer";
import { AnnouncementBar } from "@/components/landing/announcement-bar";
import { AiAssistant } from "@/components/landing/ai-assistant";
import { ScrollToTop } from "@/components/landing/scroll-to-top";
import { SocialFloat } from "@/components/landing/social-float";
import { Particles } from "@/components/landing/particles";

export const Route = createFileRoute("/")({
  /**
   * Fetch the launch config and the full CMS payload together so the first
   * painted HTML contains both admin-configured dates and all section content.
   * FAQs and testimonials come from their own tables and are fetched in
   * parallel with the CMS to avoid a waterfall.
   *
   * `serverNow` prevents the hydration mismatch (React #418) that occurs when
   * the server and client read `Date.now()` at different instants.
   */
  loader: async () => {
    const [launchRaw, cmsRaw, faqsRaw, testimonialsRaw, brandingResult] = await Promise.all([
      serverGet<unknown>("/launch-config"),
      serverGet<{ data: Record<string, CmsSection> }>("/cms"),
      serverGet<{ data: Faq[] }>("/content/faqs"),
      serverGet<{ data: Testimonial[] }>("/content/testimonials"),
      // Branding endpoint may not be deployed yet — degrade gracefully.
      settingsApi.publicSettings().catch(() => null),
    ]);

    const cmsData = (cmsRaw as { data: Record<string, CmsSection> })?.data ?? {};
    const seoSection = cmsData["seo"]?.data as
      | { title?: string; description?: string; ogImage?: string; keywords?: string }
      | undefined;

    const branding: PublicBranding = (brandingResult as { data: PublicBranding } | null)?.data ?? {
      siteName: "MyTijaara",
      tagline: "One app for food, shopping, deliveries and trusted services.",
      contactEmail: "",
      supportEmail: "",
      phone: "",
      address: "",
      launchCity: "",
      logoUrl: "",
      logoDarkUrl: "",
      faviconUrl: "",
      ogImageUrl: "",
      primaryColor: "",
      accentColor: "",
      secondaryColor: "",
      backgroundColor: "",
      surfaceColor: "",
      social: {
        instagram: "",
        twitter: "",
        facebook: "",
        linkedin: "",
        tiktok: "",
        youtube: "",
        whatsapp: "",
      },
    };

    return {
      launchConfig: normalizeLaunchConfig(launchRaw),
      serverNow: Date.now(),
      cms: cmsData,
      faqs: (faqsRaw as { data: Faq[] })?.data ?? [],
      testimonials: (testimonialsRaw as { data: Testimonial[] })?.data ?? [],
      branding,
      _seoTitle: seoSection?.title,
      _seoDescription: seoSection?.description,
      _seoOgImage: seoSection?.ogImage || branding.ogImageUrl,
      _faviconUrl: branding.faviconUrl,
    };
  },
  head: ({ loaderData }) => {
    const DEFAULT_TITLE = "MyTijaara — Everything you need, all in one place";
    const DEFAULT_DESC =
      "Order food, groceries and pharmacy items, book trusted artisans, send packages, rent cars and shop from businesses around you — all from one app built for Nigerians.";

    const d = loaderData as typeof loaderData & {
      _seoTitle?: string;
      _seoDescription?: string;
      _seoOgImage?: string;
      _faviconUrl?: string;
    };

    const title = d._seoTitle || DEFAULT_TITLE;
    const description = d._seoDescription || DEFAULT_DESC;
    const ogImage = d._seoOgImage;
    const faviconUrl = d._faviconUrl;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        ...(ogImage ? [{ property: "og:image", content: ogImage }] : []),
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [
        ...(faviconUrl
          ? [{ rel: "icon", href: faviconUrl }]
          : [{ rel: "icon", href: "/favicon.ico" }]),
      ],
    };
  },
  component: Landing,
});

/**
 * Injects admin-configured brand colors as CSS custom properties, overriding
 * the hardcoded fallbacks in styles.css. Only emits a property when the admin
 * has set a non-empty value, so unset colors keep the stylesheet default.
 */
function BrandColors({
  primaryColor,
  accentColor,
  secondaryColor,
  backgroundColor,
  surfaceColor,
}: {
  primaryColor: string;
  accentColor: string;
  secondaryColor: string;
  backgroundColor: string;
  surfaceColor: string;
}) {
  const declarations = [
    primaryColor    ? `--primary: ${primaryColor};`       : "",
    accentColor     ? `--gold: ${accentColor};`           : "",
    secondaryColor  ? `--secondary: ${secondaryColor};`   : "",
    backgroundColor ? `--background: ${backgroundColor};` : "",
    surfaceColor    ? `--surface: ${surfaceColor};`        : "",
  ]
    .filter(Boolean)
    .join(" ");
  if (!declarations) return null;
  return <style>{`:root { ${declarations} }`}</style>;
}

/**
 * Wrap the entire page in both LaunchStateProvider and CmsProvider so every
 * landing component can read its CMS data and its launch-phase variant from
 * context without prop drilling.
 */
function Landing() {
  const { launchConfig, serverNow, cms, faqs, testimonials, branding } = Route.useLoaderData();

  const announcement = cms["announcement"]?.data as
    | { enabled?: boolean; text?: string; href?: string }
    | undefined;

  return (
    <LaunchStateProvider initialConfig={launchConfig} initialNow={serverNow}>
      <BrandColors
        primaryColor={branding.primaryColor}
        accentColor={branding.accentColor}
        secondaryColor={branding.secondaryColor}
        backgroundColor={branding.backgroundColor}
        surfaceColor={branding.surfaceColor}
      />
      <CmsProvider sections={cms} faqs={faqs} testimonials={testimonials} branding={branding}>
        {announcement?.enabled && (
          <AnnouncementBar text={announcement.text ?? ""} href={announcement.href ?? "#waitlist"} />
        )}
        <Particles />
        <div className="min-h-screen bg-background text-foreground">
          <Nav />
          <main>
            <Hero />
            <TrustedBy />
            <LaunchCountdown />
            <Moments />
            <Services />
            <Why />
            <How />
            <InsideTheApp />
            <BuiltForNigerians />
            <Partners />
            <WaitlistSection />
            <FAQ />
          </main>
          <Footer />
        </div>
        {/* Floating UI — outside the scrollable content div, still inside providers */}
        <AiAssistant />
        <ScrollToTop />
        <SocialFloat />
      </CmsProvider>
    </LaunchStateProvider>
  );
}
