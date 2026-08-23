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
import { AnalyticsProvider } from "@/components/analytics/analytics-provider";

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
      serverGet<Record<string, CmsSection>>("/cms"),
      serverGet<Faq[]>("/content/faqs"),
      serverGet<Testimonial[]>("/content/testimonials"),
      // Branding endpoint may not be deployed yet — degrade gracefully.
      settingsApi.publicSettings().catch(() => null),
    ]);

    const cmsData = (cmsRaw as Record<string, CmsSection>) ?? {};
    const seoSection = cmsData["seo"]?.data as
      | {
          title?: string;
          description?: string;
          canonicalUrl?: string;
          keywords?: string;
          ogTitle?: string;
          ogDescription?: string;
          ogImage?: string;
          twitterHandle?: string;
        }
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
      iosAppUrl: "",
      androidAppUrl: "",
      googleAnalyticsId: "",
      metaPixelId: "",
    };

    const rawOgImage = seoSection?.ogImage || branding.ogImageUrl || "/og-image.png";
    const canonicalUrl = seoSection?.canonicalUrl || "https://mytijaara.com";

    // Ensure ogImage is an absolute URL for WhatsApp / social crawler previews
    let ogImageUrl = rawOgImage;
    if (rawOgImage && !rawOgImage.startsWith("http://") && !rawOgImage.startsWith("https://")) {
      const base = canonicalUrl.replace(/\/$/, "");
      ogImageUrl = `${base}/${rawOgImage.replace(/^\//, "")}`;
    }

    return {
      launchConfig: normalizeLaunchConfig(launchRaw),
      serverNow: Date.now(),
      cms: cmsData,
      faqs: (faqsRaw as Faq[]) ?? [],
      testimonials: (testimonialsRaw as Testimonial[]) ?? [],
      branding,
      _seoTitle: seoSection?.title,
      _seoDescription: seoSection?.description,
      _seoKeywords: seoSection?.keywords,
      _seoCanonicalUrl: canonicalUrl,
      _seoOgTitle: seoSection?.ogTitle || seoSection?.title,
      _seoOgDescription: seoSection?.ogDescription || seoSection?.description,
      _seoOgImage: ogImageUrl,
      _seoTwitterHandle: seoSection?.twitterHandle,
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
      _seoKeywords?: string;
      _seoCanonicalUrl?: string;
      _seoOgTitle?: string;
      _seoOgDescription?: string;
      _seoOgImage?: string;
      _seoTwitterHandle?: string;
      _faviconUrl?: string;
    };

    const title = d._seoTitle || DEFAULT_TITLE;
    const description = d._seoDescription || DEFAULT_DESC;
    const keywords = d._seoKeywords || "nigeria, super app, food delivery, groceries, pharmacy, artisans, logistics, car rental";
    const ogTitle = d._seoOgTitle || title;
    const ogDescription = d._seoOgDescription || description;
    const ogImage = d._seoOgImage;
    const canonicalUrl = d._seoCanonicalUrl;
    const twitterHandle = d._seoTwitterHandle;
    const faviconUrl = d._faviconUrl;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "keywords", content: keywords },
        { property: "og:title", content: ogTitle },
        { property: "og:description", content: ogDescription },
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: "MyTijaara" },
        ...(canonicalUrl ? [{ property: "og:url", content: canonicalUrl }] : []),
        ...(ogImage
          ? [
              { property: "og:image", content: ogImage },
              { property: "og:image:secure_url", content: ogImage },
              { property: "og:image:width", content: "1200" },
              { property: "og:image:height", content: "630" },
              { property: "og:image:type", content: "image/png" },
            ]
          : []),
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: ogTitle },
        { name: "twitter:description", content: ogDescription },
        ...(twitterHandle ? [{ name: "twitter:site", content: twitterHandle }, { name: "twitter:creator", content: twitterHandle }] : []),
        ...(ogImage ? [{ name: "twitter:image", content: ogImage }] : []),
      ],
      links: [
        ...(canonicalUrl ? [{ rel: "canonical", href: canonicalUrl }] : []),
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

  const announcementSec = cms["announcement"];
  const announcementData = announcementSec?.data as
    | { enabled?: boolean; text?: string; href?: string }
    | undefined;
  const showAnnouncement = announcementSec?.enabled !== false && announcementData?.enabled !== false && Boolean(announcementData?.text);

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
        <AnalyticsProvider>
          {showAnnouncement && (
            <AnnouncementBar text={announcementData?.text ?? ""} href={announcementData?.href ?? "#waitlist"} />
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
        </AnalyticsProvider>
      </CmsProvider>
    </LaunchStateProvider>
  );
}
